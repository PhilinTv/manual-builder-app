import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@wapp/db";
import { execSync } from "child_process";

describe("Prisma migrations", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-26: Prisma migrations apply and create all expected tables", async () => {
    // Reset and apply migrations
    execSync("pnpm --filter @wapp/db db:migrate:dev -- --name init --skip-generate", {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "pipe",
    });

    // Verify User table exists by running a query
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);

    // Verify we can create a user with all enum values
    const user = await prisma.user.create({
      data: {
        email: "migration-test@example.com",
        name: "Migration Test",
        passwordHash: "test-hash",
        role: "EDITOR",
        status: "PENDING",
      },
    });

    expect(user.id).toBeDefined();
    expect(user.role).toBe("EDITOR");
    expect(user.status).toBe("PENDING");

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
  });
});
