import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWarningById,
  updateWarning,
  deleteWarning,
} from "@/lib/services/warning-service";
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
    const warning = await getWarningById(params.id);
    return NextResponse.json({ warning });
  } catch {
    return NextResponse.json({ error: "Warning not found" }, { status: 404 });
  }
}

const updateWarningSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  severity: z.enum(["DANGER", "WARNING", "CAUTION"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateWarningSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const warning = await updateWarning(params.id, parsed.data);
    return NextResponse.json({ warning });
  } catch {
    return NextResponse.json({ error: "Warning not found" }, { status: 404 });
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
    await deleteWarning(params.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Warning not found" }, { status: 404 });
  }
}
