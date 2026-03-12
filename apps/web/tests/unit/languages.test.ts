import { describe, test, expect } from "vitest";
import { LANGUAGES, getLanguageName, isValidLanguageCode } from "@/lib/constants/languages";

describe("Language constants", () => {
  test("LANGUAGES contains at least 28 entries", () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(28);
  });

  test("each language has a unique code and non-empty name", () => {
    const codes = new Set<string>();
    for (const lang of LANGUAGES) {
      expect(lang.code).toBeTruthy();
      expect(lang.name).toBeTruthy();
      expect(codes.has(lang.code)).toBe(false);
      codes.add(lang.code);
    }
  });

  test("all expected codes are present", () => {
    const codes = LANGUAGES.map((l) => l.code);
    for (const expected of ["en", "de", "fr", "es", "it", "pt", "nl", "pl", "ja", "ko", "zh", "ru"]) {
      expect(codes).toContain(expected);
    }
  });

  test("getLanguageName returns the correct name", () => {
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("de")).toBe("German");
    expect(getLanguageName("unknown")).toBe("unknown");
  });

  test("isValidLanguageCode validates correctly", () => {
    expect(isValidLanguageCode("en")).toBe(true);
    expect(isValidLanguageCode("de")).toBe(true);
    expect(isValidLanguageCode("xyz")).toBe(false);
  });
});
