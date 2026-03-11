import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { eventBus, type SSEEvent } from "@/lib/events/event-bus";

// Mock auth
const mockSession: any = { user: null };
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock prisma
const mockFindMany = vi.fn();
vi.mock("@wapp/db", () => ({
  prisma: {
    manualAssignment: {
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

describe("SSE Route - GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.removeAllListeners();
    mockSession.user = null;
    mockFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockSession.user = null;
    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return SSE headers for authenticated requests", async () => {
    mockSession.user = {
      id: "user-1",
      name: "Test User",
      role: "ADMIN",
      email: "test@example.com",
      status: "ACTIVE",
    };
    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");
  });

  it("should send manual:published event to admin user", async () => {
    mockSession.user = {
      id: "admin-1",
      name: "Admin User",
      role: "ADMIN",
      email: "admin@example.com",
      status: "ACTIVE",
    };

    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    // Give time for the listener to be set up
    await new Promise((r) => setTimeout(r, 50));

    // Emit event
    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "other-user",
      actorName: "Other User",
    };
    eventBus.emit("sse", event);

    // Read from stream
    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("manual:published");
    expect(text).toContain("Test Manual");

    reader.cancel();
  });

  it("should send manual:published event to assigned editor", async () => {
    mockSession.user = {
      id: "editor-1",
      name: "Editor User",
      role: "EDITOR",
      email: "editor@example.com",
      status: "ACTIVE",
    };

    mockFindMany.mockResolvedValue([
      { manualId: "manual-1", userId: "editor-1" },
    ]);

    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    await new Promise((r) => setTimeout(r, 50));

    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "admin-1",
      actorName: "Admin User",
    };
    eventBus.emit("sse", event);

    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("manual:published");

    reader.cancel();
  });

  it("should NOT send manual:published event to unassigned editor", async () => {
    mockSession.user = {
      id: "editor-2",
      name: "Editor 2",
      role: "EDITOR",
      email: "editor2@example.com",
      status: "ACTIVE",
    };

    mockFindMany.mockResolvedValue([]); // Not assigned

    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    const reader = response.body!.getReader();

    await new Promise((r) => setTimeout(r, 50));

    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "admin-1",
      actorName: "Admin User",
    };
    eventBus.emit("sse", event);

    // Try to read - should timeout (no event delivered)
    const readPromise = reader.read();
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 200)
    );
    const result = await Promise.race([readPromise, timeout]);
    expect((result as any).timedOut).toBe(true);

    reader.cancel();
  });

  it("should NOT send event back to the actor", async () => {
    mockSession.user = {
      id: "user-1",
      name: "Test User",
      role: "ADMIN",
      email: "test@example.com",
      status: "ACTIVE",
    };

    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    const reader = response.body!.getReader();

    await new Promise((r) => setTimeout(r, 50));

    // Emit event where the actor is the same as the connected user
    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "user-1", // Same as authenticated user
      actorName: "Test User",
    };
    eventBus.emit("sse", event);

    const readPromise = reader.read();
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 200)
    );
    const result = await Promise.race([readPromise, timeout]);
    expect((result as any).timedOut).toBe(true);

    reader.cancel();
  });

  it("should send manual:assigned event only to affected editor", async () => {
    mockSession.user = {
      id: "editor-1",
      name: "Editor 1",
      role: "EDITOR",
      email: "editor1@example.com",
      status: "ACTIVE",
    };

    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    await new Promise((r) => setTimeout(r, 50));

    const event: SSEEvent = {
      type: "manual:assigned",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      editorId: "editor-1",
      actorName: "Admin User",
    };
    eventBus.emit("sse", event);

    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("manual:assigned");

    reader.cancel();
  });

  it("should NOT send manual:assigned event to other editors", async () => {
    mockSession.user = {
      id: "editor-2",
      name: "Editor 2",
      role: "EDITOR",
      email: "editor2@example.com",
      status: "ACTIVE",
    };

    const { GET } = await import("@/app/api/events/route");
    const request = new Request("http://localhost:3000/api/events");
    const response = await GET(request);
    const reader = response.body!.getReader();

    await new Promise((r) => setTimeout(r, 50));

    const event: SSEEvent = {
      type: "manual:assigned",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      editorId: "editor-1", // Different editor
      actorName: "Admin User",
    };
    eventBus.emit("sse", event);

    const readPromise = reader.read();
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ timedOut: true }), 200)
    );
    const result = await Promise.race([readPromise, timeout]);
    expect((result as any).timedOut).toBe(true);

    reader.cancel();
  });
});
