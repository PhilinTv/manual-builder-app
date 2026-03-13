import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "@app/db";

const prisma = new PrismaClient();

describe("Seed script", () => {
  beforeAll(async () => {
    // Ensure migrations are applied
    execSync("pnpm --filter @app/db db:migrate:dev -- --name init --skip-generate", {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "pipe",
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-25: Seed script creates an initial admin user with ACTIVE status", async () => {
    execSync("pnpm --filter @app/db db:seed", {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "pipe",
    });

    const admin = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
    });

    expect(admin).not.toBeNull();
    expect(admin!.role).toBe("ADMIN");
    expect(admin!.status).toBe("ACTIVE");
    expect(admin!.name).toBe("Admin User");
  });

  it("AC-25: Seed script is idempotent — running twice does not create duplicates", async () => {
    execSync("pnpm --filter @app/db db:seed", {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "pipe",
    });
    execSync("pnpm --filter @app/db db:seed", {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: "pipe",
    });

    const admins = await prisma.user.findMany({
      where: { email: "admin@example.com" },
    });

    expect(admins).toHaveLength(1);
  });
});
