import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createConnectionStatusTracker,
  type ConnectionStatus,
} from "@/lib/events/connection-status";

describe("Connection Status Tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not show indicator when connected", () => {
    const tracker = createConnectionStatusTracker();
    tracker.update("connected");
    expect(tracker.shouldShowIndicator()).toBe(false);
  });

  it("should not show indicator when disconnected for less than 10s", () => {
    const tracker = createConnectionStatusTracker();
    tracker.update("disconnected");
    vi.advanceTimersByTime(9000);
    expect(tracker.shouldShowIndicator()).toBe(false);
  });

  it("should show indicator when disconnected for more than 10s", () => {
    const tracker = createConnectionStatusTracker();
    const onChange = vi.fn();
    tracker.subscribe(onChange);
    tracker.update("disconnected");
    vi.advanceTimersByTime(11000);
    expect(tracker.shouldShowIndicator()).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it("should reset indicator when status changes to connected", () => {
    const tracker = createConnectionStatusTracker();
    tracker.update("disconnected");
    vi.advanceTimersByTime(11000);
    expect(tracker.shouldShowIndicator()).toBe(true);

    tracker.update("connected");
    expect(tracker.shouldShowIndicator()).toBe(false);
  });

  it("should not show indicator when status is connecting", () => {
    const tracker = createConnectionStatusTracker();
    tracker.update("connecting");
    vi.advanceTimersByTime(15000);
    expect(tracker.shouldShowIndicator()).toBe(false);
  });

  it("should clean up timer on destroy", () => {
    const tracker = createConnectionStatusTracker();
    tracker.update("disconnected");
    tracker.destroy();
    vi.advanceTimersByTime(15000);
    expect(tracker.shouldShowIndicator()).toBe(false);
  });
});
