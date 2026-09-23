import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, dummyHash } from "@/lib/auth/password";
describe("account password storage", () => {
  it("uses unique salts and accepts only the original password", async () => {
    const password = "A unique tropical passphrase 42";
    const a = await hashPassword(password),
      b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword("wrong password", a)).toBe(false);
    expect(await verifyPassword(password, dummyHash)).toBe(false);
  });
  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("password", "plain-text")).toBe(false);
  });
});
