import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => [] }) }),
      }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../../utils/test-app.js");
  app = await buildTestApp();
});

afterAll(() => vi.restoreAllMocks());

describe("Instagram OAuth init endpoint", () => {
  it("returns 503 when INSTAGRAM_CLIENT_ID is not configured", async () => {
    delete process.env["INSTAGRAM_CLIENT_ID"];
    const res = await request(app).get("/api/auth/instagram/connect").redirects(0);
    expect(res.status).toBe(503);
  });

  it("redirects with state when configured", async () => {
    process.env["INSTAGRAM_CLIENT_ID"] = "ig-id";
    const res = await request(app).get("/api/auth/instagram/connect").redirects(0);
    expect(res.status).toBe(302);
    expect((res.headers["location"] as string)).toContain("state=");
    delete process.env["INSTAGRAM_CLIENT_ID"];
  });
});

describe("Instagram OAuth callback endpoint", () => {
  it("redirects with error when state mismatches", async () => {
    const res = await request(app)
      .get("/api/auth/instagram/callback?code=foo&state=bogus")
      .redirects(0);
    expect([302, 303]).toContain(res.status);
    expect((res.headers["location"] as string).toLowerCase()).toContain("error");
  });
});
