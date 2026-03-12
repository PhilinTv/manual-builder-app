import { describe, test, expect } from "vitest";
import { MockTranslationProvider } from "@/services/translation/mock-provider";

describe("Translation provider", () => {
  test("MockTranslationProvider implements translate() returning AsyncIterable<string>", async () => {
    const provider = new MockTranslationProvider();
    const chunks: string[] = [];

    for await (const chunk of provider.translate({
      text: "Hello world",
      sourceLanguage: "en",
      targetLanguage: "de",
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    const full = chunks.join("");
    expect(full).toContain("de");
    expect(full).toContain("Hello");
  });

  test("estimateTokens returns a number greater than 0", () => {
    const provider = new MockTranslationProvider();
    const tokens = provider.estimateTokens("hello world");
    expect(tokens).toBeGreaterThan(0);
    expect(typeof tokens).toBe("number");
  });

  test("translate yields string chunks", async () => {
    const provider = new MockTranslationProvider({ chunkDelay: 0 });

    for await (const chunk of provider.translate({
      text: "Test text",
      sourceLanguage: "en",
      targetLanguage: "fr",
    })) {
      expect(typeof chunk).toBe("string");
    }
  });
});
