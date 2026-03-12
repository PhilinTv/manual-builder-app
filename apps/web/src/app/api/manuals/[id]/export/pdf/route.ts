import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canUserEdit } from "@/lib/services/manual-service";
import { prisma } from "@wapp/db";
import { generateManualPdf } from "@/services/pdf/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manualId = params.id;

  // Verify manual exists and check access
  const manual = await prisma.manual.findFirst({
    where: { id: manualId, deletedAt: null },
    include: {
      assignments: {
        include: {
          user: { select: { id: true } },
        },
      },
      languages: {
        where: { deletedAt: null },
        select: { languageCode: true },
      },
    },
  });

  if (!manual) {
    return NextResponse.json({ error: "Manual not found" }, { status: 404 });
  }

  const assignedUserIds = manual.assignments.map((a) => a.user.id);
  if (
    !canUserEdit({
      role: session.user.role,
      assignedUserIds,
      userId: session.user.id,
    })
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate language parameter
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || manual.primaryLanguage;

  const availableLanguages = [
    manual.primaryLanguage,
    ...manual.languages.map((l) => l.languageCode),
  ];

  if (!availableLanguages.includes(language)) {
    return NextResponse.json(
      { error: "Language not available for this manual" },
      { status: 400 }
    );
  }

  try {
    const { buffer, filename } = await generateManualPdf(manualId, language);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
