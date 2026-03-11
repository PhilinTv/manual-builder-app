import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, publishManual, canUserEdit } from "@/lib/services/manual-service";
import { createVersion } from "@/lib/services/version-service";
import { eventBus } from "@/lib/events/event-bus";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const manual = await publishManual(params.id);
    await createVersion(params.id, session.user.id);

    eventBus.emit("sse", {
      type: "manual:published",
      manualId: params.id,
      manualTitle: existing.productName,
      actorId: session.user.id,
      actorName: session.user.name,
    });

    return NextResponse.json({ manual });
  } catch {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }
}
