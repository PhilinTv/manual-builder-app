import { prisma } from "@app/db";
import { isValidLanguageCode, getLanguageName } from "@/lib/constants/languages";

export async function addLanguage(
  manualId: string,
  languageCode: string,
  userId: string
) {
  if (!isValidLanguageCode(languageCode)) {
    throw new Error("Invalid language code");
  }

  const manual = await prisma.manual.findUniqueOrThrow({
    where: { id: manualId },
  });

  // Create the ManualLanguage row
  const manualLanguage = await prisma.manualLanguage.create({
    data: {
      manualId,
      languageCode,
      addedById: userId,
    },
  });

  // Determine all sections from the manual content
  const sections = getSectionsFromManual(manual);

  // Create ManualTranslation rows for each section
  if (sections.length > 0) {
    await prisma.manualTranslation.createMany({
      data: sections.map((s) => ({
        manualId,
        languageCode,
        section: s.section,
        content: s.content,
        status: "NOT_TRANSLATED" as const,
      })),
    });
  }

  return manualLanguage;
}

export async function removeLanguage(manualId: string, languageCode: string) {
  await prisma.manualLanguage.update({
    where: { manualId_languageCode: { manualId, languageCode } },
    data: { deletedAt: new Date() },
  });
}

export async function getManualLanguages(manualId: string) {
  const manual = await prisma.manual.findUniqueOrThrow({
    where: { id: manualId },
    select: { primaryLanguage: true },
  });

  const languages = await prisma.manualLanguage.findMany({
    where: { manualId, deletedAt: null },
    include: { addedBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const lang of languages) {
    const completeness = await getCompleteness(manualId, lang.languageCode);
    results.push({
      code: lang.languageCode,
      name: getLanguageName(lang.languageCode),
      translated: completeness.translated,
      total: completeness.total,
      addedBy: lang.addedBy.name,
      createdAt: lang.createdAt.toISOString(),
      isPrimary: lang.languageCode === manual.primaryLanguage,
    });
  }

  return { primaryLanguage: manual.primaryLanguage, languages: results };
}

export async function getTranslations(
  manualId: string,
  languageCode: string
) {
  return prisma.manualTranslation.findMany({
    where: { manualId, languageCode, deletedAt: null },
    orderBy: { section: "asc" },
  });
}

export async function updateTranslation(
  manualId: string,
  languageCode: string,
  section: string,
  content: any,
  status?: "NOT_TRANSLATED" | "IN_PROGRESS" | "TRANSLATED"
) {
  const existing = await prisma.manualTranslation.findUnique({
    where: {
      manualId_languageCode_section: { manualId, languageCode, section },
    },
  });

  // Auto-detect status change: only when content is actually provided
  let newStatus = status;
  if (!newStatus && content !== undefined && existing?.status === "NOT_TRANSLATED") {
    newStatus = "IN_PROGRESS";
  }

  return prisma.manualTranslation.upsert({
    where: {
      manualId_languageCode_section: { manualId, languageCode, section },
    },
    update: {
      ...(content !== undefined ? { content } : {}),
      ...(newStatus ? { status: newStatus } : {}),
    },
    create: {
      manualId,
      languageCode,
      section,
      content: content !== undefined ? content : (existing?.content ?? {}),
      status: newStatus || "NOT_TRANSLATED",
    },
  });
}

export async function markAsTranslated(translationId: string) {
  return prisma.manualTranslation.update({
    where: { id: translationId },
    data: { status: "TRANSLATED" },
  });
}

export async function getCompleteness(
  manualId: string,
  languageCode: string
) {
  const translations = await prisma.manualTranslation.findMany({
    where: { manualId, languageCode, deletedAt: null },
    select: { status: true },
  });

  const total = translations.length;
  const translated = translations.filter(
    (t) => t.status === "TRANSLATED"
  ).length;

  return { translated, total };
}

// Helper: extract sections from a manual
function getSectionsFromManual(manual: {
  productName: string;
  overview: any;
  instructions: any;
  warnings: any;
}) {
  const sections: { section: string; content: any }[] = [];

  sections.push({ section: "productName", content: manual.productName });

  if (manual.overview) {
    sections.push({ section: "overview", content: manual.overview });
  }

  const instructions = (manual.instructions as any[]) || [];
  for (const inst of instructions) {
    sections.push({
      section: `instruction:${inst.id}`,
      content: { title: inst.title, body: inst.body },
    });
  }

  const warnings = (manual.warnings as any[]) || [];
  for (const warn of warnings) {
    sections.push({
      section: `warning:${warn.id}`,
      content: {
        title: warn.title,
        description: warn.description,
        severity: warn.severity,
      },
    });
  }

  return sections;
}

export { getSectionsFromManual };
