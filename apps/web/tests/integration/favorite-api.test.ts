import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock favorite service
const mockToggleFavorite = vi.fn();
const mockGetUserFavorites = vi.fn();
vi.mock("@/lib/services/favorite-service", () => ({
  toggleFavorite: (...args: any[]) => mockToggleFavorite(...args),
  getUserFavorites: (...args: any[]) => mockGetUserFavorites(...args),
}));

describe("Favorite API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/manuals/[id]/favorite", () => {
    it("AC-18: returns 401 when called without authentication", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import(
        "@/app/api/manuals/[id]/favorite/route"
      );
      const request = new Request("http://localhost/api/manuals/m1/favorite", {
        method: "POST",
      });
      const response = await POST(request as any, { params: { id: "m1" } });

      expect(response.status).toBe(401);
    });

    it("returns { favorited: true } on first toggle", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "EDITOR" },
      });
      mockToggleFavorite.mockResolvedValue({ favorited: true });

      const { POST } = await import(
        "@/app/api/manuals/[id]/favorite/route"
      );
      const request = new Request("http://localhost/api/manuals/m1/favorite", {
        method: "POST",
      });
      const response = await POST(request as any, { params: { id: "m1" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ favorited: true });
      expect(mockToggleFavorite).toHaveBeenCalledWith("user-1", "m1");
    });

    it("returns { favorited: false } on second toggle", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "EDITOR" },
      });
      mockToggleFavorite.mockResolvedValue({ favorited: false });

      const { POST } = await import(
        "@/app/api/manuals/[id]/favorite/route"
      );
      const request = new Request("http://localhost/api/manuals/m1/favorite", {
        method: "POST",
      });
      const response = await POST(request as any, { params: { id: "m1" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ favorited: false });
    });
  });

  describe("GET /api/favorites", () => {
    it("returns 401 when called without authentication", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/favorites/route");
      const request = new Request("http://localhost/api/favorites");
      const response = await GET(request as any);

      expect(response.status).toBe(401);
    });

    it("returns { manualIds: [...] } for authenticated user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "EDITOR" },
      });
      mockGetUserFavorites.mockResolvedValue(["manual-1", "manual-3"]);

      const { GET } = await import("@/app/api/favorites/route");
      const request = new Request("http://localhost/api/favorites");
      const response = await GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ manualIds: ["manual-1", "manual-3"] });
      expect(mockGetUserFavorites).toHaveBeenCalledWith("user-1");
    });
  });
});
