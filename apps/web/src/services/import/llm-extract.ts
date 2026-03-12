import { openai } from "@/lib/openai";
import type OpenAI from "openai";

export interface ExtractedManualData {
  productName: string;
  overview: string;
  instructions: { title: string; body: string }[];
  tableOfContents: string[];
  confidence: {
    productName: number;
    overview: number;
    instructions: number;
    tableOfContents: number;
  };
}

const METADATA_PROMPT = `You are a technical document parser. Given the first pages of a product manual PDF, extract metadata.

Return a JSON object with exactly these fields:
- productName: string — the product name or model (e.g. "Bosch GWS 7-100")
- overview: string — a brief overview or description of the product
- confidence: object with keys productName, overview — each a number 0-1

Return ONLY valid JSON, no markdown code fences or extra text.`;

const CHUNK_EXTRACT_PROMPT = `You are a technical document parser. You receive a chunk of raw text extracted from a product manual PDF (chunk {index} of {total}).

Extract ALL instruction sections/chapters found in this chunk. For each section, provide:
- title: string — the section/chapter heading
- body: string — the COMPLETE content formatted as clean markdown

If a section from a previous chunk continues at the start of this chunk (text without a clear new heading), use the title "Continued: [best guess heading]".

Formatting rules for body:
- Numbered lists (1. 2. 3.) for sequential steps
- Bullet lists for non-sequential items
- **Bold** for key terms, emphasis, and labels
- Sub-headings (##, ###) for sub-sections
- Preserve any tables or structured data
- Include EVERY sentence, step, note, tip, warning — do NOT summarize

Return a JSON object: { "instructions": [{ "title": "...", "body": "..." }, ...] }
Return ONLY valid JSON, no markdown code fences or extra text.`;

let clientOverride: OpenAI | null = null;

/** Allow tests to inject a mock client */
export function setClient(client: OpenAI | null): void {
  clientOverride = client;
}

async function callWithRetry(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.chat.completions.create(params);
      const content = res.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");
      return content;
    } catch (e) {
      lastError = e as Error;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("LLM call failed after 3 attempts");
}

/**
 * Group pages into chunks of approximately targetSize characters.
 * Never splits mid-page.
 */
function chunkPages(pages: string[], targetSize = 12000): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentSize = 0;

  for (const page of pages) {
    if (currentSize > 0 && currentSize + page.length > targetSize) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(page);
    currentSize += page.length;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit = 5,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < tasks.length) {
      const i = nextIdx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );
  return results;
}

async function callMetadata(
  client: OpenAI,
  pages: string[],
): Promise<{ productName: string; overview: string; confidence: { productName: number; overview: number } }> {
  const firstPages = pages.slice(0, 5).join("\n\n").slice(0, 5000);
  const json = await callWithRetry(client, {
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [
      { role: "system", content: METADATA_PROMPT },
      { role: "user", content: firstPages },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(json);
}

async function callChunkExtract(
  client: OpenAI,
  chunk: string[],
  index: number,
  total: number,
): Promise<{ title: string; body: string }[]> {
  const chunkText = chunk.join("\n\n").slice(0, 30000);
  const prompt = CHUNK_EXTRACT_PROMPT
    .replace("{index}", String(index + 1))
    .replace("{total}", String(total));

  const json = await callWithRetry(client, {
    model: "gpt-4o-mini",
    max_tokens: 16384,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: chunkText },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(json);
  const instructions = parsed.instructions;
  return Array.isArray(instructions) ? instructions : [];
}

/**
 * Merge "Continued: X" sections with the prior section of the same name.
 */
function deduplicateBoundary(
  instructions: { title: string; body: string }[],
): { title: string; body: string }[] {
  const result: { title: string; body: string }[] = [];

  for (const inst of instructions) {
    const continuedMatch = inst.title.match(/^Continued:\s*(.+)$/i);
    if (continuedMatch && result.length > 0) {
      const baseName = continuedMatch[1].trim().toLowerCase();
      // Find the last section with a matching name
      let merged = false;
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].title.toLowerCase() === baseName) {
          result[i].body += "\n\n" + inst.body;
          merged = true;
          break;
        }
      }
      if (!merged) {
        // No match found, use the base name as title
        result.push({ title: continuedMatch[1].trim(), body: inst.body });
      }
    } else {
      result.push(inst);
    }
  }

  return result;
}

export async function extractStructure(
  pages: string[],
): Promise<ExtractedManualData> {
  const client = clientOverride ?? openai;

  const chunks = chunkPages(pages);

  // Fire metadata + chunk extraction in parallel
  const chunkTasks = chunks.map(
    (chunk, i) => () => callChunkExtract(client, chunk, i, chunks.length),
  );

  const [metadata, chunkResults] = await Promise.all([
    callMetadata(client, pages),
    runWithConcurrency(chunkTasks, 5),
  ]);

  const flatInstructions = chunkResults.flat();
  const instructions = deduplicateBoundary(flatInstructions);

  // Fallback if no instructions extracted
  if (instructions.length === 0) {
    return {
      productName: metadata.productName ?? "",
      overview: metadata.overview ?? "",
      instructions: [{ title: "Manual Content", body: pages.join("\n\n") }],
      tableOfContents: [],
      confidence: {
        productName: metadata.confidence?.productName ?? 0.5,
        overview: metadata.confidence?.overview ?? 0.5,
        instructions: 0.5,
        tableOfContents: 0.5,
      },
    };
  }

  return {
    productName: metadata.productName ?? "",
    overview: metadata.overview ?? "",
    instructions,
    tableOfContents: instructions.map((i) => i.title),
    confidence: {
      productName: metadata.confidence?.productName ?? 0.8,
      overview: metadata.confidence?.overview ?? 0.8,
      instructions: 0.8,
      tableOfContents: 0.8,
    },
  };
}
