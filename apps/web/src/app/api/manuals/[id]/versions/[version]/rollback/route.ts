import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { rollbackToVersion } from "@/lib/services/version-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const versionNumber = parseInt(params.version, 10);
  if (isNaN(versionNumber)) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
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

    const newVersion = await rollbackToVersion(
      params.id,
      versionNumber,
      session.user.id
    );

    return NextResponse.json({
      newVersion: {
        id: newVersion.id,
        version: newVersion.version,
        changeSummary: newVersion.changeSummary,
        createdAt: newVersion.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
}
