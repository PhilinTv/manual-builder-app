import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import {
  addLanguage,
  getManualLanguages,
  getCompleteness,
} from "@/lib/services/translation-service";
import { isValidLanguageCode, getLanguageName } from "@/lib/constants/languages";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getManualLanguages(params.id);
  return NextResponse.json(result);
}

const addLanguageSchema = z.object({
  languageCode: z.string().min(2),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await getManualById(params.id);
    const assignedUserIds = existing.assignments.map((a) => a.user.id);
    if (
      !canUserEdit({
        role: session.user.role,
        assignedUserIds,
        userId: session.user.id,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addLanguageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    if (!isValidLanguageCode(parsed.data.languageCode)) {
      return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
    }

    const lang = await addLanguage(
      params.id,
      parsed.data.languageCode,
      session.user.id
    );

    const completeness = await getCompleteness(
      params.id,
      parsed.data.languageCode
    );

    return NextResponse.json(
      {
        code: lang.languageCode,
        name: getLanguageName(lang.languageCode),
        translated: completeness.translated,
        total: completeness.total,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Language already added" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
