import { prisma } from "@app/db";

export function computeContentHash(content: any): string {
  const str = JSON.stringify(content);
  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export async function markStaleTranslations(
  manualId: string,
  section: string,
  newContent: any
): Promise<void> {
  const newHash = computeContentHash(newContent);

  // Find all translations for this section that have a sourceHash
  const translations = await prisma.manualTranslation.findMany({
    where: {
      manualId,
      section,
      isAutoTranslated: true,
      deletedAt: null,
    },
  });

  for (const t of translations) {
    if (t.sourceHash && t.sourceHash !== newHash) {
      await prisma.manualTranslation.update({
        where: { id: t.id },
        data: {
          sourceHash: newHash,
          // Mark as needing re-translation by reverting status
          status: "IN_PROGRESS",
        },
      });
    }
  }
}
