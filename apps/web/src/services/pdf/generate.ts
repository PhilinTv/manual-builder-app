import { prisma } from "@wapp/db";
import { renderManualToHtml } from "./template";
import { generatePdfFilename } from "./filename";
import { getBrowser } from "@/lib/puppeteer";

interface ManualForPdf {
  productName: string;
  overview: any;
  instructions: Array<{
    id: string;
    title: string;
    body: any;
    order: number;
  }>;
  warnings: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    order: number;
  }>;
}

function parseManualInstructions(instructions: any): ManualForPdf["instructions"] {
  if (!instructions) return [];
  if (Array.isArray(instructions)) return instructions;
  return [];
}

function wrapTextAsTiptap(text: string): any {
  const paragraphs = text.split("\n").filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p }],
    })),
  };
}

function parseManualWarnings(
  libraryWarnings: Array<{
    order: number;
    dangerWarning: { id: string; title: string; description: string; severity: string };
  }>
): ManualForPdf["warnings"] {
  return libraryWarnings.map((mw) => ({
    id: mw.dangerWarning.id,
    title: mw.dangerWarning.title,
    description: mw.dangerWarning.description,
    severity: mw.dangerWarning.severity,
    order: mw.order,
  }));
}

export async function generateManualPdf(
  manualId: string,
  language: string
): Promise<{ buffer: Buffer; filename: string }> {
  const manual = await prisma.manual.findFirst({
    where: { id: manualId, deletedAt: null },
    include: {
      libraryWarnings: {
        include: {
          dangerWarning: true,
        },
        orderBy: { order: "asc" },
      },
      languages: {
        where: { deletedAt: null },
      },
      translations: {
        where: { languageCode: language, deletedAt: null },
      },
    },
  });

  if (!manual) {
    throw new Error("Manual not found");
  }

  // Build manual data, using translations if not the primary language
  let productName = manual.productName;
  let overview = manual.overview;
  let instructions = parseManualInstructions(manual.instructions);
  let warnings = parseManualWarnings(manual.libraryWarnings);

  if (language !== manual.primaryLanguage) {
    const translationMap = new Map<string, any>();
    for (const t of manual.translations) {
      translationMap.set(t.section, t.content);
    }

    if (translationMap.has("productName")) {
      const v = translationMap.get("productName");
      productName = typeof v === "string" ? v : v?.productName ?? productName;
    }

    if (translationMap.has("overview")) {
      const v = translationMap.get("overview");
      // Translations may be stored as plain text (from auto-translate) or Tiptap JSON
      if (typeof v === "string") {
        overview = wrapTextAsTiptap(v);
      } else {
        overview = v;
      }
    }

    instructions = instructions.map((inst) => {
      const translated = translationMap.get(`instruction:${inst.id}`);
      if (!translated) return inst;

      // Auto-translate stores "title\nbody" as a flat string
      if (typeof translated === "string") {
        const nlIndex = translated.indexOf("\n");
        const title = nlIndex >= 0 ? translated.slice(0, nlIndex) : translated;
        const bodyText = nlIndex >= 0 ? translated.slice(nlIndex + 1) : "";
        return {
          ...inst,
          title,
          body: wrapTextAsTiptap(bodyText),
        };
      }

      return {
        ...inst,
        title: translated.title ?? inst.title,
        body: translated.body ?? inst.body,
      };
    });

    warnings = warnings.map((warn) => {
      const translated = translationMap.get(`warning:${warn.id}`);
      if (!translated) return warn;

      // Auto-translate stores "title\ndescription" as a flat string
      if (typeof translated === "string") {
        const nlIndex = translated.indexOf("\n");
        const title = nlIndex >= 0 ? translated.slice(0, nlIndex) : translated;
        const description = nlIndex >= 0 ? translated.slice(nlIndex + 1) : "";
        return { ...warn, title, description };
      }

      return {
        ...warn,
        title: translated.title ?? warn.title,
        description: translated.description ?? warn.description,
      };
    });
  }

  const manualData: ManualForPdf = {
    productName,
    overview,
    instructions,
    warnings,
  };

  const html = renderManualToHtml(manualData, language);

  // Get version count for filename
  const versionCount = await prisma.manualVersion.count({
    where: { manualId },
  });
  const version = versionCount || 1;
  const filename = generatePdfFilename(manual.productName, language, version);

  // Try Puppeteer first, fall back to HTML-as-PDF
  const browser = await getBrowser();
  let buffer: Buffer;

  if (browser) {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "25mm", right: "20mm", bottom: "30mm", left: "20mm" },
      displayHeaderFooter: true,
      footerTemplate:
        '<div style="font-size:10px;text-align:center;width:100%;color:#6b7280;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      headerTemplate: "<div></div>",
    });
    await page.close();
    buffer = Buffer.from(pdfUint8);
  } else {
    // Fallback: return HTML content wrapped as a simple buffer
    // This allows the system to work without Puppeteer installed
    buffer = Buffer.from(html, "utf-8");
  }

  return { buffer, filename };
}
