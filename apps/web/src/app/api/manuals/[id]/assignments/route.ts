import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssignees, getManualById, assignUser, unassignUser } from "@/lib/services/manual-service";
import { eventBus } from "@/lib/events/event-bus";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const assignees = await getAssignees(params.id);
  return NextResponse.json({ assignees });
}

const assignSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  try {
    const assignment = await assignUser(params.id, parsed.data.userId);

    const manual = await getManualById(params.id);
    eventBus.emit("sse", {
      type: "manual:assigned",
      manualId: params.id,
      manualTitle: manual.productName,
      editorId: parsed.data.userId,
      actorName: session.user.name,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Assignment failed" }, { status: 409 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  try {
    const manual = await getManualById(params.id);
    await unassignUser(params.id, parsed.data.userId);

    eventBus.emit("sse", {
      type: "manual:unassigned",
      manualId: params.id,
      manualTitle: manual.productName,
      editorId: parsed.data.userId,
      actorName: session.user.name,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Unassignment failed" }, { status: 404 });
  }
}
