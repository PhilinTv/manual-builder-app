import { extractText } from "unpdf";

export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pages: string[]; pageCount: number }> {
  const { totalPages, text } = await extractText(new Uint8Array(buffer));
  return {
    text: text.join("\n\n"),
    pages: text,
    pageCount: totalPages,
  };
}
