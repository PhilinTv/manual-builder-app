import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@app/db";

const prisma = new PrismaClient();

describe("Version service integration", () => {
  let adminId: string;
  let editorId: string;
  let manualId: string;

  beforeAll(async () => {
    const admin = await prisma.user.upsert({
      where: { email: "version-test-admin@example.com" },
      update: {},
      create: {
        email: "version-test-admin@example.com",
        name: "Version Admin",
        passwordHash: "hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    adminId = admin.id;

    const editor = await prisma.user.upsert({
      where: { email: "version-test-editor@example.com" },
      update: {},
      create: {
        email: "version-test-editor@example.com",
        name: "Version Editor",
        passwordHash: "hash",
        role: "EDITOR",
        status: "ACTIVE",
      },
    });
    editorId = editor.id;

    const manual = await prisma.manual.create({
      data: {
        productName: "Versioned Product",
        overview: { type: "doc", content: [] },
        instructions: [],
        warnings: [],
        status: "DRAFT",
        createdById: adminId,
      },
    });
    manualId = manual.id;
  });

  afterAll(async () => {
    await prisma.manualVersion.deleteMany({ where: { manualId } });
    await prisma.manual.deleteMany({ where: { id: manualId } });
    await prisma.user.deleteMany({
      where: { email: { in: ["version-test-admin@example.com", "version-test-editor@example.com"] } },
    });
    await prisma.$disconnect();
  });

  it("createVersion creates a version with correct content snapshot", async () => {
    const { createVersion } = await import("@/lib/services/version-service");
    const version = await createVersion(manualId, adminId);

    expect(version.version).toBe(1);
    expect(version.authorId).toBe(adminId);
    expect(version.content).toHaveProperty("productName");
    expect(version.content).toHaveProperty("overview");
    expect(version.content).toHaveProperty("instructions");
    expect(version.content).toHaveProperty("warnings");
  });

  it("createVersion auto-increments version number", async () => {
    const { createVersion } = await import("@/lib/services/version-service");
    // Update manual content between versions
    await prisma.manual.update({
      where: { id: manualId },
      data: { productName: "Updated Product" },
    });
    const v2 = await createVersion(manualId, adminId);
    expect(v2.version).toBe(2);

    await prisma.manual.update({
      where: { id: manualId },
      data: { productName: "Third Version" },
    });
    const v3 = await createVersion(manualId, adminId);
    expect(v3.version).toBe(3);
  });

  it("rollbackToVersion creates version 4 matching version 1 content", async () => {
    const { rollbackToVersion, getVersionHistory } = await import("@/lib/services/version-service");

    const rollbackResult = await rollbackToVersion(manualId, 1, adminId);
    expect(rollbackResult.version).toBe(4);
    expect(rollbackResult.changeSummary).toContain("Rolled back to version 1");

    const history = await getVersionHistory(manualId);
    expect(history.length).toBe(4);

    // Version 4 content should match version 1
    const v1 = history.find((v: any) => v.version === 1);
    const v4 = history.find((v: any) => v.version === 4);
    expect((v4!.content as any).productName).toBe((v1!.content as any).productName);
  });

  it("rollback does not delete existing versions", async () => {
    const { getVersionHistory } = await import("@/lib/services/version-service");
    const history = await getVersionHistory(manualId);
    expect(history.length).toBe(4);
    expect(history.map((v: any) => v.version).sort()).toEqual([1, 2, 3, 4]);
  });
});
