import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@wapp/db";
import { processImport } from "@/services/import/pipeline";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for existing in-progress import
    const existingImport = await prisma.pdfImport.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["UPLOADING", "EXTRACTING"] },
      },
    });

    if (existingImport) {
      return NextResponse.json(
        { error: "An import is already in progress" },
        { status: 409 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    // Save file to temp directory
    const uploadDir = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "wapp-imports");
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Create import record
    const importRecord = await prisma.pdfImport.create({
      data: {
        userId: session.user.id,
        sourceFilename: file.name,
        fileSize: file.size,
        filePath,
        status: "UPLOADING",
      },
    });

    // Trigger processing asynchronously
    processImport(importRecord.id).catch((err) => {
      console.error(`Import processing failed for ${importRecord.id}:`, err);
    });

    return NextResponse.json({ importId: importRecord.id }, { status: 201 });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
