import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getManualLibraryWarnings,
  addWarningToManual,
  removeWarningFromManual,
} from "@/lib/services/warning-service";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const warnings = await getManualLibraryWarnings(params.id);
    return NextResponse.json({ warnings });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

const addWarningSchema = z.object({
  dangerWarningId: z.string().min(1),
  order: z.number().int().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const manual = await getManualById(params.id);
    const assignedUserIds = manual.assignments.map((a) => a.user.id);
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
    const parsed = addWarningSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const manualWarning = await addWarningToManual(
      params.id,
      parsed.data.dangerWarningId,
      parsed.data.order
    );
    return NextResponse.json({ manualWarning }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

const removeWarningSchema = z.object({
  dangerWarningId: z.string().min(1),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const manual = await getManualById(params.id);
    const assignedUserIds = manual.assignments.map((a) => a.user.id);
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
    const parsed = removeWarningSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    await removeWarningFromManual(params.id, parsed.data.dangerWarningId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
