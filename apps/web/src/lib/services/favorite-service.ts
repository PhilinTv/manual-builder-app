import { prisma } from "@wapp/db";

export async function toggleFavorite(
  userId: string,
  manualId: string
): Promise<{ favorited: boolean }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.userFavorite.findUnique({
      where: { userId_manualId: { userId, manualId } },
    });

    if (existing) {
      await tx.userFavorite.delete({
        where: { userId_manualId: { userId, manualId } },
      });
      return { favorited: false };
    }

    await tx.userFavorite.create({
      data: { userId, manualId },
    });
    return { favorited: true };
  });
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  const favorites = await prisma.userFavorite.findMany({
    where: { userId },
    select: { manualId: true },
  });
  return favorites.map((f) => f.manualId);
}

export async function isFavorited(
  userId: string,
  manualId: string
): Promise<boolean> {
  const favorite = await prisma.userFavorite.findUnique({
    where: { userId_manualId: { userId, manualId } },
  });
  return favorite !== null;
}
