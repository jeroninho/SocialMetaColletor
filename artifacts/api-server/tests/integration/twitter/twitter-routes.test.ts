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

describe("GET /api/twitter/profile", () => {
  it("returns the default profile when no token is connected", async () => {
    const res = await request(app).get("/api/twitter/profile");
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("techdevstudio");
    expect(res.body).toHaveProperty("followersCount");
  });

  it("uses the stored account name when a token row exists", async () => {
    tokenStore.rows = [makeToken({ platform: "twitter", accountName: "twuser" })];
    const res = await request(app).get("/api/twitter/profile");
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("twuser");
  });
});

describe("GET /api/twitter/tweets", () => {
  it("returns the default tweet listing", async () => {
    const res = await request(app).get("/api/twitter/tweets");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });

  it("respects limit and offset query params", async () => {
    const res = await request(app).get("/api/twitter/tweets?limit=2&offset=1");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });
});

describe("GET /api/twitter/analytics", () => {
  it("returns analyticsReason=not_connected when no token row exists", async () => {
    const res = await request(app).get("/api/twitter/analytics");
    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("twitter");
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns analyticsReason=not_connected when the token is disconnected", async () => {
    tokenStore.rows = [
      makeToken({ platform: "twitter", connected: false, scope: "tweet.read" }),
    ];
    const res = await request(app).get("/api/twitter/analytics");
    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns normalized analytics from the provider on the happy path", async () => {
    tokenStore.rows = [
      makeToken({ platform: "twitter", connected: true, scope: "tweet.read" }),
    ];

    const recentIso = new Date(Date.now() - 86400_000).toISOString();
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/users/me"),
          respond: () => ({
            body: {
              data: {
                id: "tw-user-1",
                username: "twuser",
                name: "TW User",
                public_metrics: {
                  followers_count: 2000,
                  following_count: 100,
                  tweet_count: 42,
                  listed_count: 5,
                },
              },
            },
          }),
        },
        {
          match: (url) => url.includes("/users/tw-user-1/tweets"),
          respond: () => ({
            body: {
              data: [
                {
                  id: "t1",
                  text: "hello",
                  created_at: recentIso,
                  public_metrics: {
                    like_count: 10,
                    retweet_count: 2,
                    reply_count: 1,
                    quote_count: 0,
                    bookmark_count: 0,
                    impression_count: 1000,
                  },
                },
                {
                  id: "t2",
                  text: "world",
                  created_at: recentIso,
                  public_metrics: {
                    like_count: 5,
                    retweet_count: 0,
                    reply_count: 0,
                    quote_count: 0,
                    bookmark_count: 0,
                    impression_count: 500,
                  },
                },
              ],
            },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/twitter/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.followerCount).toBe(2000);
    expect(res.body.totalViews).toBe(1500);
    expect(res.body.totalContent).toBe(2);
    expect(res.body.analyticsAvailable).toBe(true);
    expect(res.body.analyticsReason).toBe("ok");
  });

  it("falls back with analyticsReason=upstream_error when the provider call fails", async () => {
    tokenStore.rows = [
      makeToken({ platform: "twitter", connected: true, scope: "tweet.read" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: () => true,
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });

    const res = await request(app).get("/api/twitter/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("upstream_error");
  });

  it("returns analyticsReason=insufficient_scope when the connected token lacks tweet.read", async () => {
    tokenStore.rows = [
      makeToken({ platform: "twitter", connected: true, scope: "users.read" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/users/me"),
          respond: () => ({
            body: {
              data: {
                id: "tw-user-2",
                username: "u",
                name: "U",
                public_metrics: {
                  followers_count: 10,
                  following_count: 0,
                  tweet_count: 0,
                  listed_count: 0,
                },
              },
            },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/twitter/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("insufficient_scope");
  });
});
