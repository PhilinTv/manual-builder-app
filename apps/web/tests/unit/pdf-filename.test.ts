import { describe, it, expect } from "vitest";
import { generatePdfFilename } from "@/services/pdf/filename";

describe("generatePdfFilename", () => {
  it('returns "My_Product_EN_v3.pdf" for standard input', () => {
    expect(generatePdfFilename("My Product", "en", 3)).toBe("My_Product_EN_v3.pdf");
  });
  it("strips special characters from product name", () => {
    expect(generatePdfFilename("A/B: Test!", "en", 1)).toBe("AB_Test_EN_v1.pdf");
  });
  it("uppercases language code", () => {
    expect(generatePdfFilename("Product", "de", 2)).toBe("Product_DE_v2.pdf");
  });
  it("replaces spaces with underscores", () => {
    expect(generatePdfFilename("Some Long Name", "en", 1)).toBe("Some_Long_Name_EN_v1.pdf");
  });
});
