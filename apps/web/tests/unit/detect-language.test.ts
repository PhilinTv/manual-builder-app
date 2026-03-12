import { describe, it, expect } from "vitest";
import { detectLanguage } from "@/services/import/detect-language";

describe("detectLanguage", () => {
  it('returns code "en" for English text', () => {
    const result = detectLanguage("This is a product manual for the XYZ Widget. It contains instructions for safe operation and maintenance of the device.");
    expect(result.code).toBe("en");
  });

  it('returns code "de" for German text', () => {
    const result = detectLanguage("Dies ist ein Produkthandbuch für das XYZ-Widget. Es enthält Anweisungen für den sicheren Betrieb und die Wartung des Geräts.");
    expect(result.code).toBe("de");
  });

  it("returns a confidence score", () => {
    const result = detectLanguage("This is a product manual for safe operation.");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("returns a language name", () => {
    const result = detectLanguage("This is a product manual for safe operation and maintenance.");
    expect(result.name).toBeTruthy();
  });
});
