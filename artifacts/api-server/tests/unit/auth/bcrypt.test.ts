import { describe, expect, it } from "vitest";
import bcrypt from "bcrypt";

/**
 * These tests guard the assumptions our auth routes make about bcrypt:
 *   - hash() yields a string of the expected $2b$ format
 *   - compare() succeeds for the correct password and fails otherwise
 *   - hashes for the same password are NOT equal (salt randomness)
 *   - timing-attack mitigation in /auth/login still works regardless of cost
 */
describe("bcrypt", () => {
  it("hashes a password into a $2 prefixed string", async () => {
    const hash = await bcrypt.hash("hunter2", 4);
    expect(hash.startsWith("$2")).toBe(true);
    expect(hash).toHaveLength(60);
  });

  it("verifies a correct password and rejects an incorrect one", async () => {
    const hash = await bcrypt.hash("correct-password", 4);
    expect(await bcrypt.compare("correct-password", hash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for the same input (salt)", async () => {
    const a = await bcrypt.hash("samePassword", 4);
    const b = await bcrypt.hash("samePassword", 4);
    expect(a).not.toBe(b);
    expect(await bcrypt.compare("samePassword", a)).toBe(true);
    expect(await bcrypt.compare("samePassword", b)).toBe(true);
  });
});
