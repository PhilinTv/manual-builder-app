import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canUserEdit } from "@/lib/services/manual-service";
import { prisma } from "@app/db";
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

  const manual = await prisma.manual.findFirst({
    where: { id: manualId, deletedAt: null },
    include: {
      assignments: {
        include: {
          user: { select: { id: true } },
        },
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

  const url = new URL(request.url);
  const language =
    url.searchParams.get("language") ?? manual.primaryLanguage ?? "en";

  try {
    const { buffer } = await generateManualPdf(manualId, language);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[PDF Preview] Failed to generate PDF:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
