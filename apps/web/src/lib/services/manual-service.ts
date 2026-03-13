import { prisma, type ManualStatus } from "@app/db";

export type ManualListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ManualStatus;
  assigneeId?: string;
  language?: string;
};

export async function listManuals(params: ManualListParams) {
  const {
    page = 1,
    pageSize = 20,
    search,
    status,
    assigneeId,
    language,
  } = params;

  const where: any = {
    deletedAt: null,
  };

  if (search) {
    where.productName = { contains: search, mode: "insensitive" };
  }

  if (status) {
    where.status = status;
  }

  if (assigneeId) {
    where.assignments = { some: { userId: assigneeId } };
  }

  if (language) {
    where.languages = { some: { languageCode: language, deletedAt: null } };
  }

  const [manuals, total] = await Promise.all([
    prisma.manual.findMany({
      where,
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        languages: {
          where: { deletedAt: null },
          select: { languageCode: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.manual.count({ where }),
  ]);

  return { manuals, total, page, pageSize };
}

export async function getManualById(id: string) {
  const manual = await prisma.manual.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!manual) {
    throw new Error("Manual not found");
  }

  return manual;
}

export async function createManual(data: { productName: string }, userId: string) {
  return prisma.manual.create({
    data: {
      productName: data.productName,
      status: "DRAFT",
      createdById: userId,
    },
    select: {
      id: true,
      productName: true,
      status: true,
    },
  });
}

export async function updateManual(
  id: string,
  data: {
    productName?: string;
    overview?: any;
    instructions?: any;
    warnings?: any;
    primaryLanguage?: string;
  }
) {
  return prisma.manual.update({
    where: { id },
    data,
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function publishManual(id: string) {
  return prisma.manual.update({
    where: { id },
    data: { status: "PUBLISHED" },
    select: { id: true, status: true },
  });
}

export async function softDeleteManual(id: string) {
  return prisma.manual.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function assignUser(manualId: string, userId: string) {
  return prisma.manualAssignment.create({
    data: { manualId, userId },
  });
}

export async function unassignUser(manualId: string, userId: string) {
  return prisma.manualAssignment.delete({
    where: { manualId_userId: { manualId, userId } },
  });
}

export async function getAssignees(manualId: string) {
  const assignments = await prisma.manualAssignment.findMany({
    where: { manualId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return assignments.map((a) => a.user);
}

export function canUserEdit({
  role,
  assignedUserIds,
  userId,
}: {
  role: string;
  assignedUserIds: string[];
  userId: string;
}): boolean {
  if (role === "ADMIN") return true;
  return assignedUserIds.includes(userId);
}
