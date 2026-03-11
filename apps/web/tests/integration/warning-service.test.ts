import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@wapp/db";

const prisma = new PrismaClient();

describe("Warning service integration", () => {
  let adminId: string;
  let manual1Id: string;
  let manual2Id: string;
  let warningId: string;

  beforeAll(async () => {
    // Create test admin user
    const admin = await prisma.user.upsert({
      where: { email: "test-warning-admin@example.com" },
      update: {},
      create: {
        email: "test-warning-admin@example.com",
        name: "Warning Test Admin",
        passwordHash: "hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    adminId = admin.id;

    // Create two test manuals
    const m1 = await prisma.manual.create({
      data: {
        productName: "Warning Test Manual 1",
        status: "DRAFT",
        createdById: adminId,
      },
    });
    const m2 = await prisma.manual.create({
      data: {
        productName: "Warning Test Manual 2",
        status: "DRAFT",
        createdById: adminId,
      },
    });
    manual1Id = m1.id;
    manual2Id = m2.id;

    // Create a library warning
    const warning = await prisma.dangerWarning.create({
      data: {
        title: "Integration test warning",
        description: "Test description",
        severity: "DANGER",
      },
    });
    warningId = warning.id;

    // Link warning to both manuals
    await prisma.manualWarning.create({
      data: { manualId: manual1Id, dangerWarningId: warningId, order: 0 },
    });
    await prisma.manualWarning.create({
      data: { manualId: manual2Id, dangerWarningId: warningId, order: 0 },
    });
  });

  afterAll(async () => {
    await prisma.manualWarning.deleteMany({
      where: { dangerWarningId: warningId },
    });
    await prisma.dangerWarning.deleteMany({
      where: { id: warningId },
    });
    await prisma.manual.deleteMany({
      where: { id: { in: [manual1Id, manual2Id] } },
    });
    await prisma.user.deleteMany({
      where: { email: "test-warning-admin@example.com" },
    });
    await prisma.$disconnect();
  });

  // AC-4: Reference propagation on update
  it("updating a warning propagates to all linked manuals", async () => {
    const { updateWarning, getManualLibraryWarnings } = await import(
      "@/lib/services/warning-service"
    );

    await updateWarning(warningId, { title: "Updated integration test warning" });

    const warnings1 = await getManualLibraryWarnings(manual1Id);
    const warnings2 = await getManualLibraryWarnings(manual2Id);

    expect(warnings1.length).toBe(1);
    expect(warnings1[0].title).toBe("Updated integration test warning");
    expect(warnings2.length).toBe(1);
    expect(warnings2[0].title).toBe("Updated integration test warning");
  });

  // AC-5: Cascade on delete
  it("deleting a warning cascades removal from all manuals", async () => {
    const { deleteWarning, getManualLibraryWarnings } = await import(
      "@/lib/services/warning-service"
    );

    await deleteWarning(warningId);

    const warnings1 = await getManualLibraryWarnings(manual1Id);
    const warnings2 = await getManualLibraryWarnings(manual2Id);

    expect(warnings1).toEqual([]);
    expect(warnings2).toEqual([]);
  });
});
