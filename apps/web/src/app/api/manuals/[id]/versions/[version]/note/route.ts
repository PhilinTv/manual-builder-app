import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { updateVersionNote } from "@/lib/services/version-service";
import { z } from "zod";

const updateNoteSchema = z.object({
  note: z.string(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await getManualById(params.id);
    const assignedUserIds = existing.assignments.map((a) => a.user.id);
    if (
      !canUserEdit({
        role: session.user.role,
        assignedUserIds,
        userId: session.user.id,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const updated = await updateVersionNote(params.version, parsed.data.note);
    return NextResponse.json({ id: updated.id, note: updated.note });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
