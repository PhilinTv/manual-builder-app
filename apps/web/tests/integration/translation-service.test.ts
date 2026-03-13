import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@app/db";

const prisma = new PrismaClient();

describe("Translation service integration", () => {
  let adminId: string;
  let editorId: string;
  let manualId: string;

  beforeAll(async () => {
    const admin = await prisma.user.upsert({
      where: { email: "translation-test-admin@example.com" },
      update: {},
      create: {
        email: "translation-test-admin@example.com",
        name: "Translation Admin",
        passwordHash: "hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    adminId = admin.id;

    const editor = await prisma.user.upsert({
      where: { email: "translation-test-editor@example.com" },
      update: {},
      create: {
        email: "translation-test-editor@example.com",
        name: "Translation Editor",
        passwordHash: "hash",
        role: "EDITOR",
        status: "ACTIVE",
      },
    });
    editorId = editor.id;

    const manual = await prisma.manual.create({
      data: {
        productName: "Translated Product",
        overview: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Overview text" }] }] },
        instructions: [
          { id: "inst1", title: "Step 1", body: null, order: 0 },
          { id: "inst2", title: "Step 2", body: null, order: 1 },
        ],
        warnings: [
          { id: "warn1", title: "Caution", description: "Be careful", severity: "WARNING", order: 0 },
        ],
        status: "DRAFT",
        createdById: adminId,
      },
    });
    manualId = manual.id;
  });

  afterAll(async () => {
    await prisma.manualTranslation.deleteMany({ where: { manualId } });
    await prisma.manualLanguage.deleteMany({ where: { manualId } });
    await prisma.manual.deleteMany({ where: { id: manualId } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "translation-test-admin@example.com",
            "translation-test-editor@example.com",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  it("addLanguage creates ManualLanguage row and 5 ManualTranslation rows", async () => {
    const { addLanguage } = await import("@/lib/services/translation-service");

    const lang = await addLanguage(manualId, "de", adminId);
    expect(lang.languageCode).toBe("de");

    const translations = await prisma.manualTranslation.findMany({
      where: { manualId, languageCode: "de" },
    });
    expect(translations.length).toBe(5);

    // All should be NOT_TRANSLATED
    for (const t of translations) {
      expect(t.status).toBe("NOT_TRANSLATED");
    }

    // Check sections
    const sections = translations.map((t) => t.section).sort();
    expect(sections).toContain("productName");
    expect(sections).toContain("overview");
    expect(sections.filter((s) => s.startsWith("instruction:")).length).toBe(2);
    expect(sections.filter((s) => s.startsWith("warning:")).length).toBe(1);
  });

  it("updateTranslation auto-sets status to IN_PROGRESS for NOT_TRANSLATED section", async () => {
    const { updateTranslation } = await import("@/lib/services/translation-service");

    const updated = await updateTranslation(
      manualId,
      "de",
      "overview",
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "German overview" }] }] }
    );

    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("markAsTranslated sets status to TRANSLATED", async () => {
    const { markAsTranslated } = await import("@/lib/services/translation-service");

    const translation = await prisma.manualTranslation.findFirst({
      where: { manualId, languageCode: "de", section: "overview" },
    });

    const result = await markAsTranslated(translation!.id);
    expect(result.status).toBe("TRANSLATED");
  });

  it("getCompleteness returns correct counts", async () => {
    const { getCompleteness, markAsTranslated } = await import(
      "@/lib/services/translation-service"
    );

    // Mark 2 more as translated
    const translations = await prisma.manualTranslation.findMany({
      where: { manualId, languageCode: "de", section: { startsWith: "instruction:" } },
    });
    await markAsTranslated(translations[0].id);
    await markAsTranslated(translations[1].id);

    const completeness = await getCompleteness(manualId, "de");
    expect(completeness.translated).toBe(3);
    expect(completeness.total).toBe(5);
  });

  it("removeLanguage soft-deletes ManualLanguage without deleting translations", async () => {
    const { removeLanguage } = await import("@/lib/services/translation-service");

    await removeLanguage(manualId, "de");

    const lang = await prisma.manualLanguage.findUnique({
      where: { manualId_languageCode: { manualId, languageCode: "de" } },
    });
    expect(lang!.deletedAt).not.toBeNull();

    // Translations should still exist
    const translations = await prisma.manualTranslation.findMany({
      where: { manualId, languageCode: "de" },
    });
    expect(translations.length).toBe(5);
  });
});
