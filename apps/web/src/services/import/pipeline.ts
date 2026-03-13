import { prisma } from "@app/db";
import * as fs from "fs/promises";
import { extractTextFromPdf } from "./extract-text";
import { detectLanguage } from "./detect-language";
import { extractStructure } from "./llm-extract";
import { detectDangerWarnings } from "./detect-warnings";

export async function processImport(importId: string): Promise<void> {
  try {
    // Update status to EXTRACTING
    await prisma.pdfImport.update({
      where: { id: importId },
      data: { status: "EXTRACTING" },
    });

    // Read file
    const record = await prisma.pdfImport.findUniqueOrThrow({
      where: { id: importId },
    });

    const fileBuffer = await fs.readFile(record.filePath);

    // Extract text from PDF
    const { text, pages, pageCount } = await extractTextFromPdf(fileBuffer);

    // Detect language
    const language = detectLanguage(text);

    // Extract structure via LLM
    const extracted = await extractStructure(pages);

    // Detect warnings
    const warnings = detectDangerWarnings(text);

    // Merge warnings into extracted data
    const extractedData = {
      ...extracted,
      warnings: warnings.map((w) => ({
        severity: w.severity,
        text: w.text,
        confidence: w.confidence,
      })),
      pageCount,
    };

    // Update record with results
    await prisma.pdfImport.update({
      where: { id: importId },
      data: {
        status: "READY_FOR_REVIEW",
        rawText: text,
        extractedData: extractedData as any,
        confidence: extracted.confidence as any,
        detectedLanguage: language.code,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.pdfImport.update({
      where: { id: importId },
      data: {
        status: "FAILED",
        errorMessage: message,
        retryCount: { increment: 1 },
      },
    });
  }
}
