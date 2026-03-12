import type { TranslationProvider } from "./types";
import { OpenAITranslationProvider } from "./openai-provider";
import { MockTranslationProvider } from "./mock-provider";

export function getTranslationProvider(
  options?: { mock?: boolean; failForSections?: string[]; chunkDelay?: number }
): TranslationProvider {
  if (options?.mock || process.env.NODE_ENV === "test") {
    return new MockTranslationProvider({
      failForSections: options?.failForSections,
      chunkDelay: options?.chunkDelay,
    });
  }

  return new OpenAITranslationProvider();
}

export type { TranslationProvider, TranslationRequest, GlossaryEntry } from "./types";
