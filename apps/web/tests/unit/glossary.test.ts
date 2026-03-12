import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@wapp/db", () => ({
  prisma: {
    manualTranslation: {
      findMany: vi.fn(),
    },
    manual: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@wapp/db";

describe("Glossary extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("extractGlossary with 2 approved translations returns entries with non-empty source and target", async () => {
    const { extractGlossary } = await import("@/services/translation/glossary");

    (prisma.manualTranslation.findMany as any).mockResolvedValue([
      { section: "overview", content: "German overview translated text here" },
      { section: "instruction:1", content: "German instruction translated text" },
    ]);

    (prisma.manual.findUnique as any).mockResolvedValue({
      productName: "Widget Pro",
      overview: "English overview original text here",
      instructions: [{ id: "1", title: "Step One", body: null }],
      warnings: [],
    });

    const glossary = await extractGlossary("manual1", "de");
    expect(glossary.length).toBeGreaterThan(0);
    for (const entry of glossary) {
      expect(entry.source).toBeTruthy();
      expect(entry.target).toBeTruthy();
    }
  });

  test("extractGlossary with no approved translations returns empty array", async () => {
    const { extractGlossary } = await import("@/services/translation/glossary");

    (prisma.manualTranslation.findMany as any).mockResolvedValue([]);
    (prisma.manual.findUnique as any).mockResolvedValue(null);

    const glossary = await extractGlossary("manual1", "de");
    expect(glossary).toEqual([]);
  });

  test("extractGlossary with 100+ terms returns at most 50 entries", async () => {
    const { extractGlossary } = await import("@/services/translation/glossary");

    // Create a long text with many unique words
    const words = Array.from({ length: 120 }, (_, i) => `word${i}longtext`);
    const sourceText = words.join(" ");
    const targetText = words.map((w) => `translated${w}`).join(" ");

    (prisma.manualTranslation.findMany as any).mockResolvedValue([
      { section: "overview", content: targetText },
    ]);

    (prisma.manual.findUnique as any).mockResolvedValue({
      productName: "Widget",
      overview: sourceText,
      instructions: [],
      warnings: [],
    });

    const glossary = await extractGlossary("manual1", "de");
    expect(glossary.length).toBeLessThanOrEqual(50);
  });
});
