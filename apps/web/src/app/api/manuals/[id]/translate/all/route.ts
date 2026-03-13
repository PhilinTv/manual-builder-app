import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getManualById, canUserEdit } from "@/lib/services/manual-service";
import { getTranslations } from "@/lib/services/translation-service";
import { getTranslationProvider } from "@/services/translation";
import { extractGlossary } from "@/services/translation/glossary";
import { computeContentHash } from "@/services/translation/stale-detection";
import { prisma } from "@app/db";
import { z } from "zod";

const translateAllSchema = z.object({
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
    const parsed = translateAllSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation error" }), { status: 400 });
    }

    const { targetLanguage } = parsed.data;
    const translations = await getTranslations(params.id, targetLanguage);
    // Skip productName
    const sections = translations.filter((t) => t.section !== "productName");
    const glossary = await extractGlossary(params.id, targetLanguage);
    const provider = getTranslationProvider();

    const encoder = new TextEncoder();
    let translated = 0;
    let failed = 0;

    const readable = new ReadableStream({
      async start(controller) {
        for (const section of sections) {
          const sourceText = getSourceContent(existing, section.section);
          if (!sourceText) continue;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ sectionId: section.section, status: "start" })}\n\n`
            )
          );

          try {
            const stream = provider.translate({
              text: sourceText,
              sourceLanguage: existing.primaryLanguage || "en",
              targetLanguage,
              glossary,
              context: section.section.split(":")[0],
            });

            let fullTranslation = "";
            for await (const chunk of stream) {
              fullTranslation += chunk;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ sectionId: section.section, status: "chunk", text: chunk })}\n\n`
                )
              );
            }

            // Save
            const sourceHash = computeContentHash(sourceText);
            await prisma.manualTranslation.upsert({
              where: {
                manualId_languageCode_section: {
                  manualId: params.id,
                  languageCode: targetLanguage,
                  section: section.section,
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
                section: section.section,
                content: fullTranslation,
                isAutoTranslated: true,
                autoTranslatedAt: new Date(),
                sourceHash,
                status: "IN_PROGRESS",
              },
            });

            translated++;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ sectionId: section.section, status: "done" })}\n\n`
              )
            );
          } catch (error: any) {
            failed++;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ sectionId: section.section, status: "error", error: error.message })}\n\n`
              )
            );
          }
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, translated, failed })}\n\n`
          )
        );
        controller.close();
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
