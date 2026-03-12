import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("Password hashing utilities", () => {
  it("AC-24: hashPassword() returns a bcrypt hash", async () => {
    const hash = await hashPassword("my-secret-password");
    expect(hash).toBeDefined();
    expect(hash).not.toBe("my-secret-password");
    // bcrypt hashes start with $2a$ or $2b$
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("AC-24: verifyPassword() returns true for correct password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("correct-password", hash);
    expect(result).toBe(true);
  });

  it("AC-24: verifyPassword() returns false for incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });
});
