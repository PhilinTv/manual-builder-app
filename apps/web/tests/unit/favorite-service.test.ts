import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@wapp/db", () => ({
  prisma: {
    userFavorite: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockCreate(...args),
      delete: (...args: any[]) => mockDelete(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

describe("favorite-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toggleFavorite", () => {
    it("creates favorite when not exists, returns { favorited: true }", async () => {
      // AC-16: first toggle creates a row
      mockTransaction.mockImplementation(async (fn: any) => {
        mockFindUnique.mockResolvedValue(null);
        mockCreate.mockResolvedValue({ id: "fav-1", userId: "user-1", manualId: "manual-1" });
        return fn({
          userFavorite: {
            findUnique: mockFindUnique,
            create: mockCreate,
            delete: mockDelete,
          },
        });
      });

      const { toggleFavorite } = await import("@/lib/services/favorite-service");
      const result = await toggleFavorite("user-1", "manual-1");

      expect(result).toEqual({ favorited: true });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId_manualId: { userId: "user-1", manualId: "manual-1" } },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: { userId: "user-1", manualId: "manual-1" },
      });
    });

    it("deletes favorite when exists, returns { favorited: false }", async () => {
      // AC-16: second toggle deletes the row
      mockTransaction.mockImplementation(async (fn: any) => {
        mockFindUnique.mockResolvedValue({ id: "fav-1", userId: "user-1", manualId: "manual-1" });
        mockDelete.mockResolvedValue({});
        return fn({
          userFavorite: {
            findUnique: mockFindUnique,
            create: mockCreate,
            delete: mockDelete,
          },
        });
      });

      const { toggleFavorite } = await import("@/lib/services/favorite-service");
      const result = await toggleFavorite("user-1", "manual-1");

      expect(result).toEqual({ favorited: false });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId_manualId: { userId: "user-1", manualId: "manual-1" } },
      });
    });
  });

  describe("getUserFavorites", () => {
    it("returns correct manual IDs for the given user", async () => {
      // AC-17: per-user isolation
      mockFindMany.mockResolvedValue([
        { manualId: "manual-1" },
        { manualId: "manual-3" },
      ]);

      const { getUserFavorites } = await import("@/lib/services/favorite-service");
      const result = await getUserFavorites("user-a");

      expect(result).toEqual(["manual-1", "manual-3"]);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: "user-a" },
        select: { manualId: true },
      });
    });
  });

  describe("isFavorited", () => {
    it("returns true when favorite exists", async () => {
      mockFindUnique.mockResolvedValue({ id: "fav-1" });

      const { isFavorited } = await import("@/lib/services/favorite-service");
      const result = await isFavorited("user-1", "manual-1");

      expect(result).toBe(true);
    });

    it("returns false when favorite does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      const { isFavorited } = await import("@/lib/services/favorite-service");
      const result = await isFavorited("user-1", "manual-2");

      expect(result).toBe(false);
    });
  });
});
