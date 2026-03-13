import { prisma } from "@app/db";
import { generateChangeSummary } from "@/lib/utils/diff-summary";

interface ManualSnapshot {
  productName: string;
  overview: any;
  instructions: any[];
  warnings: any[];
  translations?: Record<string, any[]>;
}

export async function createVersion(manualId: string, authorId: string) {
  const manual = await prisma.manual.findUniqueOrThrow({
    where: { id: manualId },
  });

  // Include translations in the snapshot
  const allTranslations = await prisma.manualTranslation.findMany({
    where: { manualId, deletedAt: null },
    select: { languageCode: true, section: true, content: true, status: true },
  });

  const translationsMap: Record<string, any[]> = {};
  for (const t of allTranslations) {
    if (!translationsMap[t.languageCode]) {
      translationsMap[t.languageCode] = [];
    }
    translationsMap[t.languageCode].push({
      section: t.section,
      content: t.content,
      status: t.status,
    });
  }

  const content: ManualSnapshot = {
    productName: manual.productName,
    overview: manual.overview,
    instructions: (manual.instructions as any[]) || [],
    warnings: (manual.warnings as any[]) || [],
    ...(Object.keys(translationsMap).length > 0 ? { translations: translationsMap } : {}),
  };

  // Get the max version number
  const lastVersion = await prisma.manualVersion.findFirst({
    where: { manualId },
    orderBy: { version: "desc" },
  });

  const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

  // Generate change summary
  let changeSummary: string | null = null;
  if (lastVersion) {
    const prevContent = lastVersion.content as unknown as ManualSnapshot;
    changeSummary = generateChangeSummary(prevContent, content);
  } else {
    changeSummary = "Initial version";
  }

  return prisma.manualVersion.create({
    data: {
      manualId,
      version: nextVersion,
      content: content as any,
      authorId,
      changeSummary,
    },
  });
}

export async function getVersionHistory(manualId: string) {
  return prisma.manualVersion.findMany({
    where: { manualId },
    include: {
      author: { select: { id: true, name: true } },
    },
    orderBy: { version: "desc" },
  });
}

export async function getVersion(manualId: string, versionNumber: number) {
  return prisma.manualVersion.findUnique({
    where: { manualId_version: { manualId, version: versionNumber } },
    include: {
      author: { select: { id: true, name: true } },
    },
  });
}

export async function rollbackToVersion(
  manualId: string,
  versionNumber: number,
  authorId: string
) {
  const targetVersion = await prisma.manualVersion.findUniqueOrThrow({
    where: { manualId_version: { manualId, version: versionNumber } },
  });

  const snapshot = targetVersion.content as unknown as ManualSnapshot;

  // Update the manual with the snapshot content
  await prisma.manual.update({
    where: { id: manualId },
    data: {
      productName: snapshot.productName,
      overview: snapshot.overview,
      instructions: snapshot.instructions as any,
      warnings: snapshot.warnings as any,
    },
  });

  // Restore translations if present in snapshot
  if (snapshot.translations) {
    for (const [langCode, sections] of Object.entries(snapshot.translations)) {
      for (const s of sections as any[]) {
        await prisma.manualTranslation.upsert({
          where: {
            manualId_languageCode_section: {
              manualId,
              languageCode: langCode,
              section: s.section,
            },
          },
          update: { content: s.content, status: s.status },
          create: {
            manualId,
            languageCode: langCode,
            section: s.section,
            content: s.content,
            status: s.status,
          },
        });
      }
    }
  }

  // Create a new version recording the rollback
  const lastVersion = await prisma.manualVersion.findFirst({
    where: { manualId },
    orderBy: { version: "desc" },
  });

  const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

  return prisma.manualVersion.create({
    data: {
      manualId,
      version: nextVersion,
      content: snapshot as any,
      authorId,
      changeSummary: `Rolled back to version ${versionNumber}`,
    },
  });
}

export async function updateVersionNote(versionId: string, note: string) {
  return prisma.manualVersion.update({
    where: { id: versionId },
    data: { note },
  });
}
