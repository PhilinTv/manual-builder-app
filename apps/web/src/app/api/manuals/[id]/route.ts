import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getManualById,
  updateManual,
  softDeleteManual,
  canUserEdit,
} from "@/lib/services/manual-service";
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
    const manual = await getManualById(params.id);
    const assignedUserIds = manual.assignments.map((a) => a.user.id);
    const canEdit = canUserEdit({
      role: session.user.role,
      assignedUserIds,
      userId: session.user.id,
    });

    return NextResponse.json({ manual, canEdit });
  } catch {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }
}

const updateManualSchema = z.object({
  productName: z.string().min(1).optional(),
  overview: z.any().optional(),
  instructions: z.any().optional(),
  warnings: z.any().optional(),
  primaryLanguage: z.string().min(2).optional(),
});

export async function PATCH(
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

    const body = await request.json();
    const parsed = updateManualSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const manual = await updateManual(params.id, parsed.data);
    return NextResponse.json({ manual });
  } catch {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
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

  try {
    await softDeleteManual(params.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }
}
