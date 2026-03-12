import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@wapp/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ inactive: false });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { status: true },
    });

    if (user && user.status !== "ACTIVE") {
      return NextResponse.json({ inactive: true });
    }

    return NextResponse.json({ inactive: false });
  } catch {
    return NextResponse.json({ inactive: false });
  }
}
