import { describe, it, expect, vi, beforeEach } from "vitest";
import { eventBus, type SSEEvent } from "@/lib/events/event-bus";

describe("EventBus", () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  it("should deliver manual:published event to listener", () => {
    const listener = vi.fn();
    eventBus.on("sse", listener);

    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "user-1",
      actorName: "Admin User",
    };

    eventBus.emit("sse", event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("should deliver manual:assigned event to listener", () => {
    const listener = vi.fn();
    eventBus.on("sse", listener);

    const event: SSEEvent = {
      type: "manual:assigned",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      editorId: "editor-1",
      actorName: "Admin User",
    };

    eventBus.emit("sse", event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("should deliver manual:unassigned event to listener", () => {
    const listener = vi.fn();
    eventBus.on("sse", listener);

    const event: SSEEvent = {
      type: "manual:unassigned",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      editorId: "editor-1",
      actorName: "Admin User",
    };

    eventBus.emit("sse", event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("should deliver events to multiple listeners", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    eventBus.on("sse", listener1);
    eventBus.on("sse", listener2);

    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "user-1",
      actorName: "Admin User",
    };

    eventBus.emit("sse", event);

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it("should not deliver events after listener is removed", () => {
    const listener = vi.fn();
    eventBus.on("sse", listener);
    eventBus.off("sse", listener);

    const event: SSEEvent = {
      type: "manual:published",
      manualId: "manual-1",
      manualTitle: "Test Manual",
      actorId: "user-1",
      actorName: "Admin User",
    };

    eventBus.emit("sse", event);

    expect(listener).not.toHaveBeenCalled();
  });
});
