import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTranslations } from "@/lib/services/translation-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; lang: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const translations = await getTranslations(params.id, params.lang);

  return NextResponse.json({
    languageCode: params.lang,
    sections: translations.map((t) => ({
      section: t.section,
      content: t.content,
      status: t.status,
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}
