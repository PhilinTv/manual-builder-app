import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wapp/db";
import { hashPassword } from "@/lib/auth-utils";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "EDITOR",
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
