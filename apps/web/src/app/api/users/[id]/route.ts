import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wapp/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateUserSchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED"]).optional(),
  role: z.enum(["ADMIN", "EDITOR"]).optional(),
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
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  return NextResponse.json({ user });
}
