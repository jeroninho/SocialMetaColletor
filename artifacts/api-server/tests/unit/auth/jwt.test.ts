import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../../../src/utils/jwt.js";

describe("utils/jwt", () => {
  const ORIGINAL_SECRET = process.env["JWT_SECRET"];

  beforeEach(() => {
    process.env["JWT_SECRET"] = "test-jwt-secret";
    delete process.env["JWT_EXPIRES_IN"];
  });

  afterEach(() => {
    process.env["JWT_SECRET"] = ORIGINAL_SECRET ?? "test-jwt-secret";
  });

  it("signs and verifies a payload roundtrip", () => {
    const payload = { sub: "user-1", email: "u@example.com", nome: "Test" };
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.nome).toBe(payload.nome);
  });

  it("throws on a tampered signature", () => {
    const token = signToken({ sub: "u", email: "e@e.com", nome: "N" });
    const [h, p] = token.split(".");
    const tampered = `${h}.${p}.aaaa`;
    expect(() => verifyToken(tampered)).toThrow();
  });

  it("throws when the secret is missing", () => {
    delete process.env["JWT_SECRET"];
    expect(() => signToken({ sub: "u", email: "e@e.com", nome: "N" })).toThrow(
      /JWT_SECRET/,
    );
    expect(() => verifyToken("anything")).toThrow();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = signToken({ sub: "u", email: "e@e.com", nome: "N" });
    process.env["JWT_SECRET"] = "different-secret";
    expect(() => verifyToken(token)).toThrow();
  });

  it("honors a short JWT_EXPIRES_IN and rejects expired tokens", async () => {
    process.env["JWT_EXPIRES_IN"] = "1ms";
    const token = signToken({ sub: "u", email: "e@e.com", nome: "N" });
    await new Promise((r) => setTimeout(r, 50));
    expect(() => verifyToken(token)).toThrow();
  });
});
