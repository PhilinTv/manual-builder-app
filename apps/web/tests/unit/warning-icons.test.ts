import { describe, it, expect } from "vitest";
import { getWarningIcon } from "@/services/pdf/warning-icons";

describe("warning icons", () => {
  it("DANGER icon contains svg and octagon shape", () => {
    const icon = getWarningIcon("DANGER");
    expect(icon).toContain("<svg");
    expect(icon).toContain("octagon");
  });
  it("WARNING icon contains svg and triangle shape", () => {
    const icon = getWarningIcon("WARNING");
    expect(icon).toContain("<svg");
    expect(icon).toContain("triangle");
  });
  it("CAUTION icon contains svg", () => {
    const icon = getWarningIcon("CAUTION");
    expect(icon).toContain("<svg");
  });
  it("each severity icon is distinct", () => {
    const danger = getWarningIcon("DANGER");
    const warning = getWarningIcon("WARNING");
    const caution = getWarningIcon("CAUTION");
    expect(danger).not.toBe(warning);
    expect(warning).not.toBe(caution);
    expect(danger).not.toBe(caution);
  });
});
