import { describe, test, expect } from "vitest";
import { Prisma, TranslationStatus } from "@wapp/db";

describe("ManualTranslation schema", () => {
  test("ManualTranslation model includes Epic 8 prep fields", () => {
    const fields = Prisma.ManualTranslationScalarFieldEnum;

    expect(fields).toHaveProperty("isAutoTranslated");
    expect(fields).toHaveProperty("autoTranslatedAt");
    expect(fields).toHaveProperty("sourceHash");
  });

  test("TranslationStatus enum has expected values", () => {
    expect(TranslationStatus.NOT_TRANSLATED).toBe("NOT_TRANSLATED");
    expect(TranslationStatus.IN_PROGRESS).toBe("IN_PROGRESS");
    expect(TranslationStatus.TRANSLATED).toBe("TRANSLATED");
  });
});
