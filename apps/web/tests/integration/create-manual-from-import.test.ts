import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@wapp/db";
import { createManualFromImport } from "@/services/import/create-manual";
import { markdownToTiptap } from "@/services/import/markdown-to-tiptap";

const prisma = new PrismaClient();

describe("createManualFromImport", () => {
  let userId: string;
  let importId: string;
  const createdManualIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { email: "import-test-user@example.com" },
      update: {},
      create: {
        email: "import-test-user@example.com",
        name: "Import Test User",
        passwordHash: "hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    userId = user.id;

    const importRecord = await prisma.pdfImport.create({
      data: {
        sourceFilename: "test-manual.pdf",
        filePath: "/tmp/test-manual.pdf",
        fileSize: 1024,
        status: "READY_FOR_REVIEW",
        userId: user.id,
        rawText: "Some raw text from the PDF",
        extractedData: {},
        confidence: {},
        detectedLanguage: "en",
      },
    });
    importId = importRecord.id;
  });

  afterAll(async () => {
    if (createdManualIds.length > 0) {
      await prisma.manual.deleteMany({
        where: { id: { in: createdManualIds } },
      });
    }
    await prisma.pdfImport.deleteMany({
      where: { userId },
    });
    await prisma.user.delete({ where: { email: "import-test-user@example.com" } });
    await prisma.$disconnect();
  });

  it("stores instructions as flat array with TipTap JSONContent body", async () => {
    // Simulate what the review form sends: already-converted TipTap JSON
    const data = {
      productName: "Test Product X100",
      overview: markdownToTiptap("A product overview"),
      instructions: [
        { title: "Safety Precautions", body: markdownToTiptap("Always wear **gloves**.\n\nDo not touch hot surfaces.") },
        { title: "Installation", body: markdownToTiptap("1. Unbox the product\n2. Connect cables\n3. Power on") },
        { title: "Maintenance", body: markdownToTiptap("## Weekly\n\nClean monthly with a damp cloth.") },
      ],
      warnings: [
        { severity: "DANGER", text: "High voltage inside" },
        { severity: "WARNING", text: "Keep away from water" },
      ],
    };

    const manual = await createManualFromImport(importId, data, "en", userId);
    createdManualIds.push(manual.id);

    const saved = await prisma.manual.findUniqueOrThrow({
      where: { id: manual.id },
    });

    // Instructions must be a plain array
    const instructions = saved.instructions as any;
    expect(Array.isArray(instructions)).toBe(true);
    expect(instructions).toHaveLength(3);

    // Each instruction must have id, title, body (TipTap JSONContent), order
    for (let i = 0; i < instructions.length; i++) {
      expect(instructions[i]).toHaveProperty("id");
      expect(typeof instructions[i].id).toBe("string");
      expect(instructions[i]).toHaveProperty("title");
      expect(instructions[i]).toHaveProperty("body");
      expect(instructions[i]).toHaveProperty("order");
      expect(instructions[i].order).toBe(i);

      // body must be TipTap JSONContent (doc node)
      const body = instructions[i].body;
      expect(body).toHaveProperty("type", "doc");
      expect(body).toHaveProperty("content");
      expect(Array.isArray(body.content)).toBe(true);
      expect(body.content.length).toBeGreaterThan(0);
    }

    // Verify first instruction: paragraphs with bold inline mark
    const body0 = instructions[0].body;
    expect(body0.content[0].type).toBe("paragraph");
    const allText0 = JSON.stringify(body0);
    expect(allText0).toContain("gloves");
    const hasBold = body0.content.some((node: any) =>
      node.content?.some((c: any) => c.marks?.some((m: any) => m.type === "bold"))
    );
    expect(hasBold).toBe(true);

    // Verify second instruction: ordered list
    const body1 = instructions[1].body;
    const hasOrderedList = body1.content.some((node: any) => node.type === "orderedList");
    expect(hasOrderedList).toBe(true);

    // Verify third instruction: heading
    const body2 = instructions[2].body;
    const hasHeading = body2.content.some((node: any) => node.type === "heading");
    expect(hasHeading).toBe(true);

    // Overview must also be TipTap JSONContent
    const overview = saved.overview as any;
    expect(overview).toHaveProperty("type", "doc");
    expect(overview).toHaveProperty("content");

    // Warnings must be a plain array
    const warnings = saved.warnings as any;
    expect(Array.isArray(warnings)).toBe(true);
    expect(warnings).toHaveLength(2);

    for (let i = 0; i < warnings.length; i++) {
      expect(warnings[i]).toHaveProperty("id");
      expect(warnings[i]).toHaveProperty("severity");
      expect(warnings[i]).toHaveProperty("order");
      expect(warnings[i].order).toBe(i);
    }

    expect(warnings[0].severity).toBe("DANGER");
    expect(warnings[1].severity).toBe("WARNING");
  });

  it("stores product name and overview as TipTap JSONContent", async () => {
    await prisma.pdfImport.update({
      where: { id: importId },
      data: { status: "READY_FOR_REVIEW", manualId: null },
    });

    const data = {
      productName: "Widget Pro 3000",
      overview: markdownToTiptap("The **best** widget on the market.\n\nIdeal for home use."),
      instructions: [
        { title: "Getting Started", body: markdownToTiptap("- Read the manual\n- Check components") },
      ],
    };

    const manual = await createManualFromImport(importId, data, "de", userId);
    createdManualIds.push(manual.id);

    const saved = await prisma.manual.findUniqueOrThrow({
      where: { id: manual.id },
    });

    expect(saved.productName).toBe("Widget Pro 3000");
    expect(saved.primaryLanguage).toBe("de");
    expect(saved.status).toBe("DRAFT");

    // Overview should be TipTap doc with paragraph content
    const overview = saved.overview as any;
    expect(overview.type).toBe("doc");
    const overviewText = JSON.stringify(overview);
    expect(overviewText).toContain("best");
    expect(overviewText).toContain("bold");

    // Instructions body should be TipTap doc with bullet list
    const instructions = saved.instructions as any;
    expect(Array.isArray(instructions)).toBe(true);
    const body = instructions[0].body;
    expect(body.type).toBe("doc");
    const hasBulletList = body.content.some((node: any) => node.type === "bulletList");
    expect(hasBulletList).toBe(true);
  });
});
