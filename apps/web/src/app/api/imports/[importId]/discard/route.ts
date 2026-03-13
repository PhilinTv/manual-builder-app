import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@app/db";
import * as fs from "fs/promises";

export async function POST(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const importRecord = await prisma.pdfImport.findFirst({
    where: {
      id: params.importId,
      userId: session.user.id,
    },
  });

  if (!importRecord) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete the temp file
  try {
    await fs.unlink(importRecord.filePath);
  } catch {
    // File may already be deleted, that's OK
  }

  // Delete the import record
  await prisma.pdfImport.delete({
    where: { id: importRecord.id },
  });

  return NextResponse.json({ status: "discarded" });
}
