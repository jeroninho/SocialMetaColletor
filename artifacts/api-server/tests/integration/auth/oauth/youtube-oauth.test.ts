import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      // Most oauth provider routes don't query the db; provide a no-op stub.
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [] }),
        }),
      }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  delete process.env["YOUTUBE_CLIENT_ID"];
  const { buildTestApp } = await import("../../../utils/test-app.js");
  app = await buildTestApp();
});

afterAll(() => vi.restoreAllMocks());

describe("YouTube OAuth init endpoint", () => {
  it("returns 503 when YOUTUBE_CLIENT_ID is not configured", async () => {
    const res = await request(app).get("/api/auth/youtube/connect").redirects(0);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("redirects to Google with all required OAuth params when configured", async () => {
    process.env["YOUTUBE_CLIENT_ID"] = "test-client-id";

    const res = await request(app).get("/api/auth/youtube/connect").redirects(0);
    expect(res.status).toBe(302);
    const location = res.headers["location"] as string;
    expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain("client_id=test-client-id");
    expect(location).toContain("response_type=code");
    expect(location).toContain("yt-analytics.readonly");
    expect(location).toContain("state=");
    expect(location).toContain("access_type=offline");

    delete process.env["YOUTUBE_CLIENT_ID"];
  });
});

describe("YouTube OAuth callback endpoint", () => {
  it("redirects to the frontend with status=error when the user denies the consent", async () => {
    const res = await request(app)
      .get("/api/auth/youtube/callback?error=access_denied")
      .redirects(0);
    expect([302, 303]).toContain(res.status);
    const location = res.headers["location"] as string;
    expect(location).toContain("error");
    expect(location).toContain("youtube");
  });

  it("redirects with error when the state token is invalid", async () => {
    const res = await request(app)
      .get("/api/auth/youtube/callback?code=fakecode&state=tampered-state")
      .redirects(0);
    expect([302, 303]).toContain(res.status);
    const location = res.headers["location"] as string;
    expect(location.toLowerCase()).toContain("error");
  });
});

describe("/api/auth/config", () => {
  it("reports configured=false when env vars are absent", async () => {
    delete process.env["YOUTUBE_CLIENT_ID"];
    delete process.env["YOUTUBE_CLIENT_SECRET"];
    const res = await request(app).get("/api/auth/config");
    expect(res.status).toBe(200);
    expect(res.body.youtube.configured).toBe(false);
    expect(res.body.youtube.callbackUrl).toContain("/api/auth/youtube/callback");
  });

  it("reports configured=true when both id and secret are set", async () => {
    process.env["YOUTUBE_CLIENT_ID"] = "id";
    process.env["YOUTUBE_CLIENT_SECRET"] = "secret";
    const res = await request(app).get("/api/auth/config");
    expect(res.body.youtube.configured).toBe(true);
    delete process.env["YOUTUBE_CLIENT_ID"];
    delete process.env["YOUTUBE_CLIENT_SECRET"];
  });
});
