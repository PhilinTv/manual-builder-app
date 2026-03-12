import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { getTranslationProvider } from "@/services/translation";
import { extractGlossary } from "@/services/translation/glossary";
import { computeContentHash } from "@/services/translation/stale-detection";
import { prisma } from "@wapp/db";
import { z } from "zod";

const translateSchema = z.object({
  section: z.string(),
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

function getSourceContent(manual: any, section: string): string {
  if (section === "productName") return manual.productName;
  if (section === "overview") return textFromJson(manual.overview);
  if (section.startsWith("instruction:")) {
    const id = section.replace("instruction:", "");
    const instructions = (manual.instructions as any[]) || [];
    const inst = instructions.find((i: any) => i.id === id);
    return inst ? `${inst.title}\n${textFromJson(inst.body)}` : "";
  }
  if (section.startsWith("warning:")) {
    const id = section.replace("warning:", "");
    const warnings = (manual.warnings as any[]) || [];
    const warn = warnings.find((w: any) => w.id === id);
    return warn ? `${warn.title}\n${warn.description}` : "";
  }
  return "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
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
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    const body = await request.json();
    const parsed = translateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation error" }), { status: 400 });
    }

    const { section, targetLanguage } = parsed.data;
    const sourceText = getSourceContent(existing, section);

    if (!sourceText) {
      return new Response(JSON.stringify({ error: "No source content" }), { status: 400 });
    }

    const glossary = await extractGlossary(params.id, targetLanguage);
    const provider = getTranslationProvider();
    const stream = provider.translate({
      text: sourceText,
      sourceLanguage: existing.primaryLanguage || "en",
      targetLanguage,
      glossary,
      context: section.split(":")[0],
    });

    const encoder = new TextEncoder();
    let fullTranslation = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            fullTranslation += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }

          // Save the translation
          const sourceHash = computeContentHash(sourceText);
          const translation = await prisma.manualTranslation.upsert({
            where: {
              manualId_languageCode_section: {
                manualId: params.id,
                languageCode: targetLanguage,
                section,
              },
            },
            update: {
              content: fullTranslation,
              isAutoTranslated: true,
              autoTranslatedAt: new Date(),
              sourceHash,
              status: "IN_PROGRESS",
            },
            create: {
              manualId: params.id,
              languageCode: targetLanguage,
              section,
              content: fullTranslation,
              isAutoTranslated: true,
              autoTranslatedAt: new Date(),
              sourceHash,
              status: "IN_PROGRESS",
            },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, translationId: translation.id })}\n\n`
            )
          );
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message || "Translation failed" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }
}
