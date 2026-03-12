import { describe, it, expect } from "vitest";
import { generateChangeSummary } from "@/lib/utils/diff-summary";

const baseSnapshot = {
  productName: "Test Product",
  overview: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Overview text" }] }] },
  instructions: [
    { id: "i1", title: "Step 1", body: { type: "doc", content: [] }, order: 0 },
    { id: "i2", title: "Step 2", body: { type: "doc", content: [] }, order: 1 },
  ],
  warnings: [
    { id: "w1", title: "Warning 1", description: "Be careful", severity: "DANGER", order: 0 },
    { id: "w2", title: "Warning 2", description: "Watch out", severity: "CAUTION", order: 1 },
  ],
};

describe("generateChangeSummary", () => {
  it("returns 'No changes' for identical snapshots", () => {
    const result = generateChangeSummary(baseSnapshot, baseSnapshot);
    expect(result === "" || result === "No changes").toBe(true);
  });

  it("detects overview changes", () => {
    const updated = {
      ...baseSnapshot,
      overview: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Updated overview" }] }] },
    };
    const result = generateChangeSummary(baseSnapshot, updated);
    expect(result.toLowerCase()).toContain("overview");
  });

  it("detects added instructions", () => {
    const updated = {
      ...baseSnapshot,
      instructions: [
        ...baseSnapshot.instructions,
        { id: "i3", title: "Step 3", body: { type: "doc", content: [] }, order: 2 },
      ],
    };
    const result = generateChangeSummary(baseSnapshot, updated);
    expect(result.toLowerCase()).toContain("chapter");
  });

  it("detects removed warnings", () => {
    const updated = {
      ...baseSnapshot,
      warnings: [baseSnapshot.warnings[0]],
    };
    const result = generateChangeSummary(baseSnapshot, updated);
    expect(result.toLowerCase()).toContain("warning");
  });

  it("detects multiple section changes", () => {
    const updated = {
      ...baseSnapshot,
      overview: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Changed" }] }] },
      instructions: [
        ...baseSnapshot.instructions,
        { id: "i3", title: "Step 3", body: { type: "doc", content: [] }, order: 2 },
      ],
    };
    const result = generateChangeSummary(baseSnapshot, updated);
    expect(result.toLowerCase()).toContain("overview");
    expect(result.toLowerCase()).toContain("chapter");
  });
});
