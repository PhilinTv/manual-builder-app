import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@wapp/db";
import { createManualFromImport } from "@/services/import/create-manual";
import { z } from "zod";

const confirmSchema = z.object({
  productName: z.string().min(1),
  overview: z.any(),
  instructions: z.array(
    z.object({
      title: z.string(),
      body: z.any(),
    })
  ),
  warnings: z
    .array(
      z.object({
        severity: z.string(),
        text: z.string(),
      })
    )
    .optional(),
  language: z.string().min(2).max(5),
});

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

  if (importRecord.status !== "READY_FOR_REVIEW") {
    return NextResponse.json(
      { error: "Import is not ready for review" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = confirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const manual = await createManualFromImport(
    importRecord.id,
    parsed.data,
    parsed.data.language,
    session.user.id
  );

  return NextResponse.json({ manualId: manual.id }, { status: 201 });
}
