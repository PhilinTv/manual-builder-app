import { describe, it, expect } from "vitest";
import { detectDangerWarnings } from "@/services/import/detect-warnings";

describe("detectDangerWarnings", () => {
  it('detects WARNING keyword and returns severity "WARNING"', () => {
    const result = detectDangerWarnings("WARNING: Do not submerge in water");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("WARNING");
    expect(result[0].text).toContain("submerge");
  });

  it('detects DANGER keyword and returns severity "DANGER"', () => {
    const result = detectDangerWarnings("DANGER: High voltage inside");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("DANGER");
  });

  it('detects CAUTION keyword and returns severity "CAUTION"', () => {
    const result = detectDangerWarnings("CAUTION: Handle with care");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CAUTION");
  });

  it('maps ATTENTION to severity "CAUTION"', () => {
    const result = detectDangerWarnings("ATTENTION: Keep away from children");
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CAUTION");
  });

  it("returns empty array for text without warning keywords", () => {
    const result = detectDangerWarnings("This is a normal paragraph about product usage.");
    expect(result).toHaveLength(0);
  });

  it("detects multiple warnings in the same text", () => {
    const text = "WARNING: Do not submerge. DANGER: High voltage. CAUTION: Hot surface.";
    const result = detectDangerWarnings(text);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("includes confidence score between 0 and 1", () => {
    const result = detectDangerWarnings("WARNING: Do not submerge in water");
    expect(result[0].confidence).toBeGreaterThan(0);
    expect(result[0].confidence).toBeLessThanOrEqual(1);
  });
});
