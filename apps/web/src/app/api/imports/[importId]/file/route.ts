import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@app/db";
import * as fs from "fs/promises";

export async function GET(
  _request: NextRequest,
  { params }: { params: { importId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await prisma.pdfImport.findFirst({
    where: {
      id: params.importId,
      userId: session.user.id,
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await fs.readFile(record.filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${record.sourceFilename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
