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
  process.env["YOUTUBE_CLIENT_ID"] = "yt-id";
  process.env["YOUTUBE_CLIENT_SECRET"] = "yt-secret";
  process.env["INSTAGRAM_CLIENT_ID"] = "ig-id";
  process.env["INSTAGRAM_CLIENT_SECRET"] = "ig-secret";
  process.env["FACEBOOK_CLIENT_ID"] = "fb-id";
  process.env["FACEBOOK_CLIENT_SECRET"] = "fb-secret";
  const { buildTestApp } = await import("../utils/test-app.js");
  app = await buildTestApp();
});

afterAll(() => {
  for (const k of [
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "INSTAGRAM_CLIENT_ID",
    "INSTAGRAM_CLIENT_SECRET",
    "FACEBOOK_CLIENT_ID",
    "FACEBOOK_CLIENT_SECRET",
  ]) {
    delete process.env[k];
  }
  vi.restoreAllMocks();
});

describe("E2E: OAuth provider readiness check across all platforms", () => {
  it("/api/auth/config reports the configured platforms", async () => {
    const res = await request(app).get("/api/auth/config");
    expect(res.status).toBe(200);
    expect(res.body.youtube.configured).toBe(true);
    expect(res.body.instagram.configured).toBe(true);
    expect(res.body.facebook.configured).toBe(true);
  });

  it("init endpoints return a 302 redirect with state for every configured provider", async () => {
    for (const platform of ["youtube", "instagram", "facebook"]) {
      const res = await request(app)
        .get(`/api/auth/${platform}/connect`)
        .redirects(0);
      expect(res.status, `${platform} should redirect`).toBe(302);
      const location = (res.headers["location"] as string) ?? "";
      expect(location).toContain("state=");
    }
  });

  it("invalid state on callbacks short-circuits to a frontend redirect", async () => {
    for (const platform of ["youtube", "instagram", "facebook"]) {
      const res = await request(app)
        .get(`/api/auth/${platform}/callback?code=abc&state=tampered`)
        .redirects(0);
      expect([302, 303]).toContain(res.status);
      expect(((res.headers["location"] as string) ?? "").toLowerCase()).toContain("error");
    }
  });
});
