import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@app/db", () => {
  const mockPrisma = {
    dangerWarning: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    manualWarning: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return {
    prisma: mockPrisma,
    Severity: { DANGER: "DANGER", WARNING: "WARNING", CAUTION: "CAUTION" },
  };
});

import { prisma } from "@app/db";

describe("warning-service unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-19: Case-insensitive search
  describe("searchWarnings", () => {
    it("searches case-insensitively by title", async () => {
      const mockWarnings = [
        { id: "1", title: "Electric shock", severity: "DANGER" },
      ];
      (prisma.dangerWarning.findMany as any).mockResolvedValue(mockWarnings);

      const { searchWarnings } = await import("@/lib/services/warning-service");
      const result = await searchWarnings("ELECTRIC");

      expect(prisma.dangerWarning.findMany).toHaveBeenCalledWith({
        where: {
          title: { contains: "ELECTRIC", mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
          severity: true,
        },
        orderBy: { title: "asc" },
      });
      expect(result).toEqual(mockWarnings);
    });
  });

  // AC-20: Validation on createWarning
  describe("createWarning", () => {
    it("throws a validation error when title is empty", async () => {
      const { createWarning } = await import("@/lib/services/warning-service");

      await expect(
        createWarning({ title: "", description: "desc", severity: "DANGER" })
      ).rejects.toThrow("Title is required");
    });

    it("throws a validation error when title is whitespace only", async () => {
      const { createWarning } = await import("@/lib/services/warning-service");

      await expect(
        createWarning({ title: "   ", description: "desc", severity: "DANGER" })
      ).rejects.toThrow("Title is required");
    });

    it("throws a validation error when description is empty", async () => {
      const { createWarning } = await import("@/lib/services/warning-service");

      await expect(
        createWarning({ title: "Valid", description: "", severity: "DANGER" })
      ).rejects.toThrow("Description is required");
    });

    it("creates a warning with valid input", async () => {
      const mockWarning = {
        id: "1",
        title: "Electric shock hazard",
        description: "Risk of electrocution",
        severity: "DANGER",
      };
      (prisma.dangerWarning.create as any).mockResolvedValue(mockWarning);

      const { createWarning } = await import("@/lib/services/warning-service");
      const result = await createWarning({
        title: "Electric shock hazard",
        description: "Risk of electrocution",
        severity: "DANGER",
      });

      expect(result).toEqual(mockWarning);
      expect(prisma.dangerWarning.create).toHaveBeenCalledWith({
        data: {
          title: "Electric shock hazard",
          description: "Risk of electrocution",
          severity: "DANGER",
        },
      });
    });
  });
});
