import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { getTranslations } from "@/lib/services/translation-service";
import { getTranslationProvider } from "@/services/translation";
import { z } from "zod";

const estimateSchema = z.object({
  sectionIds: z.array(z.string()),
  targetLanguage: z.string(),
});

function textFromJson(json: any): string {
  if (!json) return "";
  if (typeof json === "string") return json;
  if (json.content) {
    return json.content
      .map((node: any) => {
        if (node.type === "text") return node.text || "";
        if (node.content) return textFromJson(node);
        return "";
      })
      .join("");
  }
  return JSON.stringify(json);
}

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
    const parsed = estimateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const provider = getTranslationProvider();
    const translations = await getTranslations(params.id, parsed.data.targetLanguage);

    // Get source content for sections
    let sections = translations;
    if (parsed.data.sectionIds.length > 0) {
      sections = translations.filter((t) => parsed.data.sectionIds.includes(t.section));
    }
    // Filter out productName
    sections = sections.filter((t) => t.section !== "productName");

    let totalText = "";
    for (const section of sections) {
      totalText += textFromJson(section.content) + " ";
    }

    const estimatedInputTokens = provider.estimateTokens(totalText) + 200; // +200 for system prompt
    const estimatedOutputTokens = estimatedInputTokens; // Rough estimate: similar length output
    const estimatedCost = (estimatedInputTokens * 0.15 + estimatedOutputTokens * 0.6) / 1_000_000;

    return NextResponse.json({
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      sectionCount: sections.length,
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
