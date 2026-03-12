import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { removeLanguage } from "@/lib/services/translation-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; lang: string } }
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

    await removeLanguage(params.id, params.lang);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Language not found" }, { status: 404 });
  }
}
