import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf } from "../../utils/db-chain.js";
import { installFetchMock } from "../../../src/test/fetchMock.js";
import { makeToken, type FixtureToken } from "../../fixtures/tokens.js";

const tokenStore: { rows: FixtureToken[] } = { rows: [] };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(tokenStore.rows),
      insert: () => ({ values: async () => undefined }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  tokenStore.rows = [];
});

afterAll(() => vi.restoreAllMocks());

describe("GET /api/instagram/profile", () => {
  it("returns the default profile when no token is connected", async () => {
    const res = await request(app).get("/api/instagram/profile");
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("techdevstudio");
    expect(res.body).toHaveProperty("followersCount");
  });

  it("uses the stored account name when a token row exists", async () => {
    tokenStore.rows = [makeToken({ platform: "instagram", accountName: "myhandle" })];
    const res = await request(app).get("/api/instagram/profile");
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("myhandle");
  });
});

describe("GET /api/instagram/media", () => {
  it("returns the default media listing", async () => {
    const res = await request(app).get("/api/instagram/media");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });

  it("respects limit and offset query params", async () => {
    const res = await request(app).get("/api/instagram/media?limit=2&offset=1");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });

  it("falls back to defaults when query params are malformed", async () => {
    const res = await request(app).get("/api/instagram/media?limit=abc");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(20);
  });
});

describe("GET /api/instagram/analytics", () => {
  it("returns analyticsReason=not_connected when no token row exists", async () => {
    const res = await request(app).get("/api/instagram/analytics");
    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("instagram");
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns analyticsReason=not_connected when the token is disconnected", async () => {
    tokenStore.rows = [
      makeToken({ platform: "instagram", connected: false, scope: "user_media" }),
    ];
    const res = await request(app).get("/api/instagram/analytics");
    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns normalized analytics from the provider on the happy path", async () => {
    tokenStore.rows = [
      makeToken({ platform: "instagram", connected: true, scope: "user_profile,user_media" }),
    ];

    const recentTimestamp = new Date(Date.now() - 86400_000).toISOString();
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("graph.instagram.com/me/media"),
          respond: () => ({
            body: {
              data: [
                { id: "m1", like_count: 100, comments_count: 20, timestamp: recentTimestamp },
                { id: "m2", like_count: 50, comments_count: 5, timestamp: recentTimestamp },
              ],
            },
          }),
        },
        {
          match: (url) =>
            url.includes("graph.instagram.com/me?") || url.endsWith("graph.instagram.com/me"),
          respond: () => ({
            body: { id: "ig1", username: "tester", account_type: "PERSONAL", media_count: 12 },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/instagram/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.totalContent).toBe(2);
    expect(res.body.totalViews).toBe(175);
    expect(res.body.analyticsAvailable).toBe(true);
    expect(res.body.analyticsReason).toBe("ok");
  });

  it("falls back with analyticsReason=upstream_error when the provider call fails", async () => {
    tokenStore.rows = [
      makeToken({ platform: "instagram", connected: true, scope: "user_media" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: () => true,
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });

    const res = await request(app).get("/api/instagram/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("upstream_error");
  });
});
