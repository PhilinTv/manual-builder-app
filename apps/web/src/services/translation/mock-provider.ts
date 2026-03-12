import type { TranslationProvider, TranslationRequest } from "./types";

export class MockTranslationProvider implements TranslationProvider {
  private shouldFail: Set<string> = new Set();
  private chunkDelay: number;

  constructor(options?: { failForSections?: string[]; chunkDelay?: number }) {
    if (options?.failForSections) {
      this.shouldFail = new Set(options.failForSections);
    }
    this.chunkDelay = options?.chunkDelay ?? 10;
  }

  async *translate(request: TranslationRequest): AsyncIterable<string> {
    if (this.shouldFail.has(request.context || "")) {
      throw new Error("Mock translation error");
    }

    const translated = `[${request.targetLanguage}] ${request.text}`;
    const words = translated.split(" ");

    for (const word of words) {
      if (this.chunkDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.chunkDelay));
      }
      yield word + " ";
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
