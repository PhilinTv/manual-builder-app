import { prisma } from "@wapp/db";
import type { GlossaryEntry } from "./types";

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

function extractTerms(text: string): string[] {
  // Extract multi-word noun phrases and technical terms
  // Simple heuristic: split by spaces and take capitalized or technical-looking words
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  return [...new Set(words)];
}

export async function extractGlossary(
  manualId: string,
  targetLanguage: string
): Promise<GlossaryEntry[]> {
  // Find approved/translated sections for this manual+language
  const translations = await prisma.manualTranslation.findMany({
    where: {
      manualId,
      languageCode: targetLanguage,
      status: "TRANSLATED",
      deletedAt: null,
    },
    select: { section: true, content: true },
  });

  if (translations.length === 0) return [];

  // Get source content for the same sections
  const manual = await prisma.manual.findUnique({
    where: { id: manualId },
    select: {
      productName: true,
      overview: true,
      instructions: true,
      warnings: true,
    },
  });

  if (!manual) return [];

  const entries: GlossaryEntry[] = [];

  for (const t of translations) {
    let sourceText = "";
    const targetText = textFromJson(t.content);

    if (t.section === "productName") {
      sourceText = manual.productName;
    } else if (t.section === "overview") {
      sourceText = textFromJson(manual.overview);
    } else if (t.section.startsWith("instruction:")) {
      const instId = t.section.replace("instruction:", "");
      const instructions = (manual.instructions as any[]) || [];
      const inst = instructions.find((i: any) => i.id === instId);
      if (inst) sourceText = `${inst.title} ${textFromJson(inst.body)}`;
    } else if (t.section.startsWith("warning:")) {
      const warnId = t.section.replace("warning:", "");
      const warnings = (manual.warnings as any[]) || [];
      const warn = warnings.find((w: any) => w.id === warnId);
      if (warn) sourceText = `${warn.title} ${warn.description}`;
    }

    if (sourceText && targetText) {
      // Extract key terms and create glossary pairs
      const sourceTerms = extractTerms(sourceText);
      const targetTerms = extractTerms(targetText);

      // Pair up terms by position (simple heuristic)
      const minLen = Math.min(sourceTerms.length, targetTerms.length);
      for (let i = 0; i < minLen; i++) {
        if (sourceTerms[i].length > 3 && targetTerms[i].length > 3) {
          entries.push({ source: sourceTerms[i], target: targetTerms[i] });
        }
      }
    }
  }

  // Deduplicate and limit to 50
  const unique = new Map<string, GlossaryEntry>();
  for (const entry of entries) {
    unique.set(entry.source.toLowerCase(), entry);
  }

  return Array.from(unique.values()).slice(0, 50);
}
