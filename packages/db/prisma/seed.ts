import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await hash("admin123", 12);
  const userHash = await hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash: adminHash, role: "ADMIN", status: "ACTIVE" },
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "editor@example.com" },
    update: { passwordHash: userHash, role: "EDITOR", status: "ACTIVE" },
    create: {
      email: "editor@example.com",
      name: "Editor User",
      passwordHash: userHash,
      role: "EDITOR",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "pending@example.com" },
    update: { passwordHash: userHash, status: "PENDING" },
    create: {
      email: "pending@example.com",
      name: "Pending User",
      passwordHash: userHash,
      role: "EDITOR",
      status: "PENDING",
    },
  });

  await prisma.user.upsert({
    where: { email: "deactivated@example.com" },
    update: { passwordHash: userHash, status: "DEACTIVATED" },
    create: {
      email: "deactivated@example.com",
      name: "Deactivated User",
      passwordHash: userHash,
      role: "EDITOR",
      status: "DEACTIVATED",
    },
  });

  await prisma.user.upsert({
    where: { email: "pending2@example.com" },
    update: { passwordHash: userHash, status: "PENDING" },
    create: {
      email: "pending2@example.com",
      name: "Pending User 2",
      passwordHash: userHash,
      role: "EDITOR",
      status: "PENDING",
    },
  });

  await prisma.user.upsert({
    where: { email: "pending3@example.com" },
    update: { passwordHash: userHash, status: "PENDING" },
    create: {
      email: "pending3@example.com",
      name: "Pending User 3",
      passwordHash: userHash,
      role: "EDITOR",
      status: "PENDING",
    },
  });

  await prisma.user.upsert({
    where: { email: "pending4@example.com" },
    update: { passwordHash: userHash, status: "PENDING" },
    create: {
      email: "pending4@example.com",
      name: "Pending User 4",
      passwordHash: userHash,
      role: "EDITOR",
      status: "PENDING",
    },
  });

  await prisma.user.upsert({
    where: { email: "editor2@example.com" },
    update: { passwordHash: userHash, role: "EDITOR", status: "ACTIVE" },
    create: {
      email: "editor2@example.com",
      name: "Editor User 2",
      passwordHash: userHash,
      role: "EDITOR",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "deactivated2@example.com" },
    update: { passwordHash: userHash, status: "DEACTIVATED" },
    create: {
      email: "deactivated2@example.com",
      name: "Deactivated User 2",
      passwordHash: userHash,
      role: "EDITOR",
      status: "DEACTIVATED",
    },
  });

  await prisma.user.upsert({
    where: { email: "existing@example.com" },
    update: { passwordHash: userHash, status: "ACTIVE" },
    create: {
      email: "existing@example.com",
      name: "Existing User",
      passwordHash: userHash,
      role: "EDITOR",
      status: "ACTIVE",
    },
  });

  // --- Seed manuals for Epic 2 E2E tests ---
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  const editor = await prisma.user.findUnique({ where: { email: "editor@example.com" } });
  const editor2 = await prisma.user.findUnique({ where: { email: "editor2@example.com" } });

  if (admin && editor && editor2) {
    // Only seed manuals if none exist yet (avoid nuking user-created data)
    const existingCount = await prisma.manual.count();
    if (existingCount === 0) {
      const manualNames = [
        "Alpha Widget", "Beta Gadget", "Gamma Widget", "Delta Device", "Epsilon Engine",
        "Zeta Sensor", "Eta Controller", "Theta Module", "Iota Interface", "Kappa Kit",
        "Lambda Lens", "Mu Motor", "Nu Node", "Xi Xray", "Omicron Optic",
        "Pi Processor", "Rho Relay", "Sigma Switch", "Tau Terminal", "Upsilon Unit",
        "Phi Filter", "Chi Chip", "Psi Panel", "Omega Oscillator", "Acme Actuator",
      ];

      const manualIds: string[] = [];
      for (let i = 0; i < manualNames.length; i++) {
        const manual = await prisma.manual.create({
          data: {
            productName: manualNames[i],
            status: i % 4 === 0 ? "PUBLISHED" : "DRAFT",
            createdById: admin.id,
          },
        });
        manualIds.push(manual.id);
      }

      // Assign editor to first 10 manuals
      for (let i = 0; i < 10; i++) {
        await prisma.manualAssignment.create({
          data: { manualId: manualIds[i], userId: editor.id },
        });
      }

      // Assign editor2 to manuals 5-15
      for (let i = 5; i < 15; i++) {
        await prisma.manualAssignment.create({
          data: { manualId: manualIds[i], userId: editor2.id },
        });
      }

      console.log(`Seed completed: ${manualNames.length} manuals created with assignments`);
    } else {
      console.log(`Seed skipped manuals: ${existingCount} already exist`);
    }
  }

  console.log("Seed completed: all test users created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
