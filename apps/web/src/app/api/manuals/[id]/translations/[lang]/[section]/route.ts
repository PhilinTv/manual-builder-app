import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { updateTranslation } from "@/lib/services/translation-service";
import { z } from "zod";

const updateTranslationSchema = z.object({
  content: z.any().optional(),
  status: z.enum(["NOT_TRANSLATED", "IN_PROGRESS", "TRANSLATED"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; lang: string; section: string } }
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
    const parsed = updateTranslationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const result = await updateTranslation(
      params.id,
      params.lang,
      decodeURIComponent(params.section),
      parsed.data.content,
      parsed.data.status
    );

    return NextResponse.json({
      section: result.section,
      content: result.content,
      status: result.status,
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
