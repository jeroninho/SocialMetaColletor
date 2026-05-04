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

describe("Facebook OAuth init endpoint", () => {
  it("returns 503 when FACEBOOK_CLIENT_ID is not configured", async () => {
    delete process.env["FACEBOOK_CLIENT_ID"];
    const res = await request(app).get("/api/auth/facebook/connect").redirects(0);
    expect(res.status).toBe(503);
  });

  it("redirects to Facebook OAuth dialog when configured", async () => {
    process.env["FACEBOOK_CLIENT_ID"] = "fb-id";
    const res = await request(app).get("/api/auth/facebook/connect").redirects(0);
    expect(res.status).toBe(302);
    expect((res.headers["location"] as string).toLowerCase()).toContain("facebook");
    delete process.env["FACEBOOK_CLIENT_ID"];
  });
});
