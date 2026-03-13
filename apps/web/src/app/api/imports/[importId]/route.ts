import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@app/db";
import { processImport } from "@/services/import/pipeline";

export async function GET(
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

  return NextResponse.json({
    id: importRecord.id,
    status: importRecord.status,
    sourceFilename: importRecord.sourceFilename,
    fileSize: importRecord.fileSize,
    extractedData: importRecord.extractedData,
    confidence: importRecord.confidence,
    detectedLanguage: importRecord.detectedLanguage,
    errorMessage: importRecord.errorMessage,
    retryCount: importRecord.retryCount,
    manualId: importRecord.manualId,
    createdAt: importRecord.createdAt,
    updatedAt: importRecord.updatedAt,
  });
}

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

  if (importRecord.status !== "FAILED") {
    return NextResponse.json(
      { error: "Only failed imports can be retried" },
      { status: 400 }
    );
  }

  // Re-trigger processing
  await prisma.pdfImport.update({
    where: { id: importRecord.id },
    data: { status: "UPLOADING", errorMessage: null },
  });

  processImport(importRecord.id).catch((err) => {
    console.error(`Import retry failed for ${importRecord.id}:`, err);
  });

  return NextResponse.json({ status: "retrying" });
}
