import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@wapp/db";

const prisma = new PrismaClient();

describe("Favorite service integration", () => {
  let userAId: string;
  let userBId: string;
  let manualIds: string[] = [];

  beforeAll(async () => {
    const userA = await prisma.user.upsert({
      where: { email: "fav-test-a@example.com" },
      update: {},
      create: {
        email: "fav-test-a@example.com",
        name: "Fav Test A",
        passwordHash: "hash",
        role: "EDITOR",
        status: "ACTIVE",
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.upsert({
      where: { email: "fav-test-b@example.com" },
      update: {},
      create: {
        email: "fav-test-b@example.com",
        name: "Fav Test B",
        passwordHash: "hash",
        role: "EDITOR",
        status: "ACTIVE",
      },
    });
    userBId = userB.id;

    // Create an admin for manual creation
    const admin = await prisma.user.upsert({
      where: { email: "fav-test-admin@example.com" },
      update: {},
      create: {
        email: "fav-test-admin@example.com",
        name: "Fav Test Admin",
        passwordHash: "hash",
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    const m1 = await prisma.manual.create({
      data: { productName: "Fav Manual 1", status: "DRAFT", createdById: admin.id },
    });
    const m2 = await prisma.manual.create({
      data: { productName: "Fav Manual 2", status: "DRAFT", createdById: admin.id },
    });
    const m3 = await prisma.manual.create({
      data: { productName: "Fav Manual 3", status: "DRAFT", createdById: admin.id },
    });
    manualIds = [m1.id, m2.id, m3.id];
  });

  afterAll(async () => {
    await prisma.userFavorite.deleteMany({
      where: {
        userId: { in: [userAId, userBId] },
      },
    });
    await prisma.manual.deleteMany({
      where: { id: { in: manualIds } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "fav-test-a@example.com",
            "fav-test-b@example.com",
            "fav-test-admin@example.com",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  it("AC-13: user A favorites a manual, user B does not see it", async () => {
    const { toggleFavorite, getUserFavorites } = await import(
      "@/lib/services/favorite-service"
    );

    // User A favorites manual 1 and manual 2
    await toggleFavorite(userAId, manualIds[0]);
    await toggleFavorite(userAId, manualIds[1]);

    // User B favorites manual 3 only
    await toggleFavorite(userBId, manualIds[2]);

    const userAFavs = await getUserFavorites(userAId);
    const userBFavs = await getUserFavorites(userBId);

    expect(userAFavs).toContain(manualIds[0]);
    expect(userAFavs).toContain(manualIds[1]);
    expect(userAFavs).not.toContain(manualIds[2]);

    expect(userBFavs).toContain(manualIds[2]);
    expect(userBFavs).not.toContain(manualIds[0]);
    expect(userBFavs).not.toContain(manualIds[1]);
  });

  it("toggleFavorite creates then deletes a favorite", async () => {
    const { toggleFavorite, isFavorited } = await import(
      "@/lib/services/favorite-service"
    );

    const result1 = await toggleFavorite(userBId, manualIds[0]);
    expect(result1).toEqual({ favorited: true });
    expect(await isFavorited(userBId, manualIds[0])).toBe(true);

    const result2 = await toggleFavorite(userBId, manualIds[0]);
    expect(result2).toEqual({ favorited: false });
    expect(await isFavorited(userBId, manualIds[0])).toBe(false);
  });
});
