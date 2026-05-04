import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { decryptToken } from "../../../../src/utils/crypto.js";
import { installFetchMock } from "../../../../src/test/fetchMock.js";

interface CapturedToken {
  platform: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  connected: boolean;
  scope: string | null;
}

const captured: { last?: CapturedToken } = {};

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      delete: () => ({ where: async () => undefined }),
      insert: () => ({
        values: async (row: CapturedToken) => {
          captured.last = row;
          return undefined;
        },
      }),
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => [] }) }),
      }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  process.env["TOKEN_SECRET"] = "0".repeat(64);
  process.env["YOUTUBE_CLIENT_ID"] = "yt-test-client";
  process.env["YOUTUBE_CLIENT_SECRET"] = "yt-test-secret";
  process.env["FACEBOOK_CLIENT_ID"] = "fb-test-client";
  process.env["FACEBOOK_CLIENT_SECRET"] = "fb-test-secret";
  process.env["INSTAGRAM_CLIENT_ID"] = "ig-test-client";
  process.env["INSTAGRAM_CLIENT_SECRET"] = "ig-test-secret";
  const { buildTestApp } = await import("../../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  captured.last = undefined;
});

afterAll(() => {
  for (const k of [
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "FACEBOOK_CLIENT_ID",
    "FACEBOOK_CLIENT_SECRET",
    "INSTAGRAM_CLIENT_ID",
    "INSTAGRAM_CLIENT_SECRET",
  ]) {
    delete process.env[k];
  }
  vi.restoreAllMocks();
});

async function obtainState(platform: string): Promise<string> {
  const res = await request(app).get(`/api/auth/${platform}/connect`).redirects(0);
  expect([302, 303]).toContain(res.status);
  const url = new URL(res.headers["location"] as string);
  const state = url.searchParams.get("state");
  expect(state).toBeTruthy();
  return state!;
}

describe("YouTube OAuth callback — token persistence", () => {
  it("persists ciphertext (not plaintext) for both access and refresh tokens", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("oauth2.googleapis.com/token"),
          respond: () => ({
            body: {
              access_token: "yt-plaintext-access-token",
              refresh_token: "yt-plaintext-refresh-token",
              expires_in: 3600,
              scope:
                "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
            },
          }),
        },
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({ body: { items: [{ snippet: { title: "Captured Channel" } }] } }),
        },
      ],
    });

    const state = await obtainState("youtube");
    const res = await request(app)
      .get(`/api/auth/youtube/callback?code=fake-code&state=${state}`)
      .redirects(0);
    installed.restore();

    expect([302, 303]).toContain(res.status);
    const row = captured.last;
    expect(row).toBeDefined();
    expect(row!.platform).toBe("youtube");
    expect(row!.accountName).toBe("Captured Channel");
    expect(row!.connected).toBe(true);
    expect(row!.scope).toContain("yt-analytics.readonly");

    expect(row!.accessToken).not.toBe("yt-plaintext-access-token");
    expect(decryptToken(row!.accessToken)).toBe("yt-plaintext-access-token");

    expect(row!.refreshToken).not.toBeNull();
    expect(row!.refreshToken).not.toBe("yt-plaintext-refresh-token");
    expect(decryptToken(row!.refreshToken!)).toBe("yt-plaintext-refresh-token");

    expect(row!.expiresAt).toBeInstanceOf(Date);
    const deltaMs = row!.expiresAt!.getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(3500 * 1000);
    expect(deltaMs).toBeLessThan(3700 * 1000);
  });

  it("persists null refreshToken when the IdP did not return one", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("oauth2.googleapis.com/token"),
          respond: () => ({
            body: {
              access_token: "yt-no-refresh-access",
              expires_in: 1800,
              scope: "https://www.googleapis.com/auth/youtube.readonly",
            },
          }),
        },
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({ body: { items: [] } }),
        },
      ],
    });

    const state = await obtainState("youtube");
    await request(app).get(`/api/auth/youtube/callback?code=x&state=${state}`).redirects(0);
    installed.restore();

    expect(captured.last).toBeDefined();
    expect(captured.last!.refreshToken).toBeNull();
    expect(decryptToken(captured.last!.accessToken)).toBe("yt-no-refresh-access");
  });

  it("does not write a token row when the token-exchange returns non-2xx", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("oauth2.googleapis.com/token"),
          respond: () => ({ status: 400, body: { error: "invalid_grant" } }),
        },
      ],
    });

    const state = await obtainState("youtube");
    const res = await request(app)
      .get(`/api/auth/youtube/callback?code=bad&state=${state}`)
      .redirects(0);
    installed.restore();

    expect([302, 303]).toContain(res.status);
    expect(captured.last).toBeUndefined();
    expect((res.headers["location"] as string).toLowerCase()).toContain("error");
  });
});

describe("Facebook OAuth callback — token persistence", () => {
  it("encrypts the long-lived token and computes expiresAt from expires_in", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) =>
            url.includes("graph.facebook.com/v18.0/oauth/access_token") &&
            !url.includes("fb_exchange_token"),
          respond: () => ({ body: { access_token: "fb-short-lived", expires_in: 3600 } }),
        },
        {
          match: (url) =>
            url.includes("graph.facebook.com/v18.0/oauth/access_token") &&
            url.includes("fb_exchange_token"),
          respond: () => ({ body: { access_token: "fb-long-lived", expires_in: 5_184_000 } }),
        },
        {
          match: (url) => url.includes("graph.facebook.com/me"),
          respond: () => ({ body: { id: "1", name: "FB User" } }),
        },
      ],
    });

    const state = await obtainState("facebook");
    await request(app).get(`/api/auth/facebook/callback?code=c&state=${state}`).redirects(0);
    installed.restore();

    const row = captured.last;
    expect(row).toBeDefined();
    expect(row!.platform).toBe("facebook");
    expect(row!.accountName).toBe("FB User");
    expect(row!.refreshToken).toBeNull();
    expect(row!.accessToken).not.toBe("fb-long-lived");
    expect(decryptToken(row!.accessToken)).toBe("fb-long-lived");
    const days = (row!.expiresAt!.getTime() - Date.now()) / (24 * 3600 * 1000);
    expect(days).toBeGreaterThan(59);
    expect(days).toBeLessThan(61);
  });
});

describe("Instagram OAuth callback — token persistence", () => {
  it("encrypts the access token; refreshToken is always null for this provider", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("api.instagram.com/oauth/access_token"),
          respond: () => ({ body: { access_token: "ig-short-lived" } }),
        },
        {
          match: (url) => url.includes("graph.instagram.com/access_token"),
          respond: () => ({ body: { access_token: "ig-long-lived", expires_in: 5_184_000 } }),
        },
        {
          match: (url) => url.includes("graph.instagram.com/me"),
          respond: () => ({ body: { id: "10", username: "ig_user" } }),
        },
      ],
    });

    const state = await obtainState("instagram");
    await request(app).get(`/api/auth/instagram/callback?code=c&state=${state}`).redirects(0);
    installed.restore();

    const row = captured.last;
    expect(row).toBeDefined();
    expect(row!.platform).toBe("instagram");
    expect(row!.accountName).toBe("ig_user");
    expect(row!.refreshToken).toBeNull();
    expect(row!.accessToken).not.toBe("ig-long-lived");
    expect(decryptToken(row!.accessToken)).toBe("ig-long-lived");
    expect(row!.scope).toBe("user_profile,user_media");
    expect(row!.expiresAt).toBeInstanceOf(Date);
  });
});
