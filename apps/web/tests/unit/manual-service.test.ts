import { describe, it, expect } from "vitest";
import { canUserEdit } from "@/lib/services/manual-service";

describe("canUserEdit", () => {
  it("AC-25: returns true for admin regardless of assignment", () => {
    const result = canUserEdit({
      role: "ADMIN",
      assignedUserIds: ["other-user-id"],
      userId: "admin-user-id",
    });
    expect(result).toBe(true);
  });

  it("AC-25: returns true for assigned editor", () => {
    const result = canUserEdit({
      role: "EDITOR",
      assignedUserIds: ["editor-1", "editor-2"],
      userId: "editor-1",
    });
    expect(result).toBe(true);
  });

  it("AC-25: returns false for unassigned editor", () => {
    const result = canUserEdit({
      role: "EDITOR",
      assignedUserIds: ["editor-1"],
      userId: "editor-2",
    });
    expect(result).toBe(false);
  });
});
