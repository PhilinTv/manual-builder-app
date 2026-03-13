import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@app/db";

const prisma = new PrismaClient();

describe("Manual service integration", () => {
  let adminId: string;
  let editorId: string;
  let manualIds: string[] = [];

  beforeAll(async () => {
    // Create test users
    const admin = await prisma.user.upsert({
      where: { email: "test-admin@example.com" },
      update: {},
      create: {
        email: "test-admin@example.com",
        name: "Test Admin",
        passwordHash: "hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    adminId = admin.id;

    const editor = await prisma.user.upsert({
      where: { email: "test-editor@example.com" },
      update: {},
      create: {
        email: "test-editor@example.com",
        name: "Test Editor",
        passwordHash: "hash",
        role: "EDITOR",
        status: "ACTIVE",
      },
    });
    editorId = editor.id;

    // Create test manuals
    const m1 = await prisma.manual.create({
      data: {
        productName: "Alpha Widget",
        status: "DRAFT",
        createdById: adminId,
      },
    });
    const m2 = await prisma.manual.create({
      data: {
        productName: "Beta Gadget",
        status: "PUBLISHED",
        createdById: adminId,
      },
    });
    const m3 = await prisma.manual.create({
      data: {
        productName: "Gamma Widget",
        status: "DRAFT",
        createdById: adminId,
      },
    });
    manualIds = [m1.id, m2.id, m3.id];

    // Assign editor to first manual only
    await prisma.manualAssignment.create({
      data: { manualId: m1.id, userId: editorId },
    });
  });

  afterAll(async () => {
    await prisma.manualAssignment.deleteMany({
      where: { manualId: { in: manualIds } },
    });
    await prisma.manual.deleteMany({
      where: { id: { in: manualIds } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ["test-admin@example.com", "test-editor@example.com"] } },
    });
    await prisma.$disconnect();
  });

  it("AC-23: listManuals with status filter returns only drafts", async () => {
    const { listManuals } = await import("@/lib/services/manual-service");
    const result = await listManuals({ status: "DRAFT" });
    expect(result.manuals.length).toBeGreaterThanOrEqual(2);
    result.manuals.forEach((m: any) => expect(m.status).toBe("DRAFT"));
  });

  it("AC-23: listManuals with search filter returns matching manuals", async () => {
    const { listManuals } = await import("@/lib/services/manual-service");
    const result = await listManuals({ search: "Widget" });
    expect(result.manuals.length).toBeGreaterThanOrEqual(2);
    result.manuals.forEach((m: any) =>
      expect(m.productName.toLowerCase()).toContain("widget")
    );
  });

  it("AC-23: listManuals with assigneeId filter returns only assigned manuals", async () => {
    const { listManuals } = await import("@/lib/services/manual-service");
    const result = await listManuals({ assigneeId: editorId });
    expect(result.manuals.length).toBeGreaterThanOrEqual(1);
    result.manuals.forEach((m: any) => {
      const assigneeIds = m.assignments.map((a: any) => a.userId);
      expect(assigneeIds).toContain(editorId);
    });
  });

  it("AC-24: softDeleteManual sets deletedAt and excludes from list", async () => {
    const { softDeleteManual, listManuals } = await import("@/lib/services/manual-service");
    await softDeleteManual(manualIds[2]);

    const manual = await prisma.manual.findUnique({ where: { id: manualIds[2] } });
    expect(manual?.deletedAt).not.toBeNull();

    const result = await listManuals({});
    const ids = result.manuals.map((m: any) => m.id);
    expect(ids).not.toContain(manualIds[2]);

    // Restore for cleanup
    await prisma.manual.update({
      where: { id: manualIds[2] },
      data: { deletedAt: null },
    });
  });
});
