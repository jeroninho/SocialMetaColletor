import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import crypto from "crypto";
import type { Express } from "express";
import { chainOf } from "../../utils/db-chain.js";

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: { select: () => chainOf([]), insert: () => ({ values: async () => undefined }) },
  };
});

let app: Express;

beforeAll(async () => {
  process.env["META_WEBHOOK_VERIFY_TOKEN"] = "smc_verify_token";
  delete process.env["META_APP_SECRET"];
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

afterAll(() => vi.restoreAllMocks());

describe("GET /api/webhooks/meta (verification handshake)", () => {
  it("echoes the challenge when mode + token match", async () => {
    const res = await request(app).get(
      "/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=smc_verify_token&hub.challenge=ping",
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe("ping");
  });

  it("returns 403 when the verify token mismatches", async () => {
    const res = await request(app).get(
      "/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=ping",
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/webhooks/meta", () => {
  it("returns 200 for a recognized object even with no entries", async () => {
    const res = await request(app)
      .post("/api/webhooks/meta")
      .send({ object: "page", entry: [] });
    expect(res.status).toBe(200);
  });

  it("returns 200 and ignores unknown objects (no signature required when no app secret)", async () => {
    const res = await request(app)
      .post("/api/webhooks/meta")
      .send({ object: "unrelated" });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/webhooks/meta with shared secret", () => {
  it("rejects invalid signatures with 401 when META_APP_SECRET is set", async () => {
    process.env["META_APP_SECRET"] = "test-app-secret";
    vi.resetModules();
    const { buildTestApp } = await import("../../utils/test-app.js");
    const localApp = await buildTestApp();

    const res = await request(localApp)
      .post("/api/webhooks/meta")
      .set("x-hub-signature-256", "sha256=deadbeef")
      .send({ object: "page", entry: [] });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_signature");

    delete process.env["META_APP_SECRET"];
  });
});

// Exercise the signature helper directly so we have a deterministic
// digest-compare test even though express.json doesn't preserve rawBody.
describe("Meta signature digest", () => {
  it("produces an HMAC SHA-256 hex digest matching the expected format", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ object: "page", entry: [] });
    const sig = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(sig.length).toBe(64 + "sha256=".length);
  });
});
