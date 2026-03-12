import { describe, it, expect } from "vitest";
import { computeContentHash } from "@/services/translation/stale-detection";

describe("Stale detection", () => {
  it("computeContentHash returns consistent hash for same content", () => {
    const hash1 = computeContentHash({ text: "hello world" });
    const hash2 = computeContentHash({ text: "hello world" });
    expect(hash1).toBe(hash2);
  });

  it("computeContentHash returns different hash for different content", () => {
    const hash1 = computeContentHash({ text: "hello world" });
    const hash2 = computeContentHash({ text: "hello world changed" });
    expect(hash1).not.toBe(hash2);
  });

  it("computeContentHash returns a non-empty string", () => {
    const hash = computeContentHash("some content");
    expect(hash.length).toBeGreaterThan(0);
    expect(typeof hash).toBe("string");
  });
});
