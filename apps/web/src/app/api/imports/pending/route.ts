import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@wapp/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingImport = await prisma.pdfImport.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["UPLOADING", "EXTRACTING", "READY_FOR_REVIEW"] },
    },
    select: {
      id: true,
      status: true,
    },
  });

  return NextResponse.json({
    hasPending: !!pendingImport,
    importId: pendingImport?.id ?? null,
    status: pendingImport?.status ?? null,
  });
}
