import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { encryptToken, decryptToken } from "../../../src/utils/crypto.js";

const VALID_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("utils/crypto AES-256-GCM token encryption", () => {
  const original = process.env["TOKEN_SECRET"];

  beforeEach(() => {
    process.env["TOKEN_SECRET"] = VALID_KEY;
  });

  afterAll(() => {
    process.env["TOKEN_SECRET"] = original ?? VALID_KEY;
  });

  it("roundtrips a plaintext token", () => {
    const cipher = encryptToken("oauth-access-token-123");
    expect(cipher).not.toContain("oauth-access-token-123");
    expect(decryptToken(cipher)).toBe("oauth-access-token-123");
  });

  it("produces distinct ciphertext for the same plaintext (random IV)", () => {
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same-token");
    expect(decryptToken(b)).toBe("same-token");
  });

  it("throws on tampered ciphertext (auth-tag check)", () => {
    const cipher = encryptToken("important-token");
    const buf = Buffer.from(cipher, "base64url");
    // Flip a bit in the encrypted body region (after iv+authtag).
    buf[buf.length - 1] = buf[buf.length - 1] ^ 0x01;
    const tampered = buf.toString("base64url");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws when TOKEN_SECRET is missing", () => {
    delete process.env["TOKEN_SECRET"];
    expect(() => encryptToken("x")).toThrow(/TOKEN_SECRET/);
    expect(() => decryptToken("anything")).toThrow();
  });

  it("throws when TOKEN_SECRET is not 32 bytes", () => {
    process.env["TOKEN_SECRET"] = "deadbeef"; // 4 bytes
    expect(() => encryptToken("x")).toThrow(/32 bytes/);
  });

  it("throws on truncated ciphertext", () => {
    expect(() => decryptToken("abc")).toThrow();
  });
});
