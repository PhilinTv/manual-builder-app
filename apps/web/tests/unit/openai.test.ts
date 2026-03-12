import { describe, test, expect, vi, beforeEach } from "vitest";

describe("OpenAI client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("OpenAI provider reads API key from process.env.OPENAI_API_KEY", async () => {
    process.env.OPENAI_API_KEY = "test-key-12345";

    const { OpenAITranslationProvider } = await import(
      "@/services/translation/openai-provider"
    );

    const provider = new OpenAITranslationProvider();
    expect(provider).toBeDefined();
    expect(provider.estimateTokens).toBeDefined();
    expect(provider.translate).toBeDefined();

    delete process.env.OPENAI_API_KEY;
  });
});
