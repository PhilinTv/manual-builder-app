import { prisma, type Severity } from "@app/db";

export type WarningListParams = {
  search?: string;
  severity?: Severity;
};

export async function listWarnings(params: WarningListParams = {}) {
  const { search, severity } = params;

  const where: any = {};

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  if (severity) {
    where.severity = severity;
  }

  const warnings = await prisma.dangerWarning.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return warnings;
}

export async function getWarningById(id: string) {
  const warning = await prisma.dangerWarning.findUnique({
    where: { id },
  });

  if (!warning) {
    throw new Error("Warning not found");
  }

  return warning;
}

export async function createWarning(data: {
  title: string;
  description: string;
  severity: Severity;
}) {
  if (!data.title || data.title.trim() === "") {
    throw new Error("Title is required");
  }

  if (!data.description || data.description.trim() === "") {
    throw new Error("Description is required");
  }

  if (!data.severity) {
    throw new Error("Severity is required");
  }

  return prisma.dangerWarning.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim(),
      severity: data.severity,
    },
  });
}

export async function updateWarning(
  id: string,
  data: {
    title?: string;
    description?: string;
    severity?: Severity;
  }
) {
  await getWarningById(id);

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.severity !== undefined) updateData.severity = data.severity;

  return prisma.dangerWarning.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteWarning(id: string) {
  await getWarningById(id);

  return prisma.dangerWarning.delete({
    where: { id },
  });
}

export async function searchWarnings(query: string) {
  return prisma.dangerWarning.findMany({
    where: {
      title: { contains: query, mode: "insensitive" },
    },
    select: {
      id: true,
      title: true,
      severity: true,
    },
    orderBy: { title: "asc" },
  });
}

export async function addWarningToManual(
  manualId: string,
  dangerWarningId: string,
  order?: number
) {
  return prisma.manualWarning.create({
    data: {
      manualId,
      dangerWarningId,
      order: order ?? 0,
    },
    include: {
      dangerWarning: true,
    },
  });
}

export async function removeWarningFromManual(
  manualId: string,
  dangerWarningId: string
) {
  return prisma.manualWarning.delete({
    where: {
      manualId_dangerWarningId: { manualId, dangerWarningId },
    },
  });
}

export async function getManualLibraryWarnings(manualId: string) {
  const manualWarnings = await prisma.manualWarning.findMany({
    where: { manualId },
    include: {
      dangerWarning: true,
    },
    orderBy: { order: "asc" },
  });

  return manualWarnings.map((mw) => ({
    ...mw.dangerWarning,
    order: mw.order,
    manualWarningId: mw.id,
  }));
}
