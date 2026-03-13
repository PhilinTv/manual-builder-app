import { prisma } from "@app/db";

interface ImportedManualData {
  productName: string;
  overview: any; // TipTap JSONContent
  instructions: { title: string; body: any }[]; // body is TipTap JSONContent
  warnings?: { severity: string; text: string }[];
}

export async function createManualFromImport(
  importId: string,
  data: ImportedManualData,
  language: string,
  userId: string
) {
  const manual = await prisma.$transaction(async (tx) => {
    // Create the manual
    const manual = await tx.manual.create({
      data: {
        productName: data.productName,
        overview: data.overview,
        instructions: data.instructions.map((inst, idx) => ({
          id: `section-${idx}`,
          title: inst.title,
          body: inst.body,
          order: idx,
        })),
        warnings: data.warnings
          ? data.warnings.map((w, idx) => ({
              id: `warning-${idx}`,
              title: "",
              description: w.text,
              severity: w.severity,
              order: idx,
            }))
          : undefined,
        primaryLanguage: language,
        status: "DRAFT",
        createdById: userId,
      },
    });

    // Update the import record
    await tx.pdfImport.update({
      where: { id: importId },
      data: {
        status: "COMPLETED",
        manualId: manual.id,
      },
    });

    return manual;
  });

  return manual;
}
