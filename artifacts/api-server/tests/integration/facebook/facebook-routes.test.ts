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

describe("GET /api/facebook/page", () => {
  it("returns the default account name when no token is connected", async () => {
    const res = await request(app).get("/api/facebook/page");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("fb_page_001");
    expect(res.body.name).toBe("TechDevStudio");
    expect(res.body).toHaveProperty("followersCount");
  });

  it("returns the stored account name when a token row exists", async () => {
    tokenStore.rows = [makeToken({ platform: "facebook", accountName: "MyPage" })];
    const res = await request(app).get("/api/facebook/page");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("MyPage");
  });
});

describe("GET /api/facebook/posts", () => {
  it("returns the default page of posts", async () => {
    const res = await request(app).get("/api/facebook/posts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
    expect(res.body.total).toBe(res.body.items.length);
  });

  it("respects limit and offset query params", async () => {
    const res = await request(app).get("/api/facebook/posts?limit=2&offset=1");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });

  it("falls back to defaults when query params are malformed", async () => {
    const res = await request(app).get("/api/facebook/posts?limit=abc");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });
});

describe("GET /api/facebook/analytics", () => {
  it("returns the mock payload with analyticsReason=not_connected when no token row exists", async () => {
    const res = await request(app).get("/api/facebook/analytics");
    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("facebook");
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns analyticsReason=not_connected when the token is disconnected", async () => {
    tokenStore.rows = [
      makeToken({ platform: "facebook", connected: false, scope: "read_insights" }),
    ];
    const res = await request(app).get("/api/facebook/analytics");
    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns normalized analytics from the provider on the happy path", async () => {
    tokenStore.rows = [
      makeToken({ platform: "facebook", connected: true, scope: "read_insights" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/me/accounts"),
          respond: () => ({
            body: {
              data: [
                {
                  id: "page_123",
                  name: "Test Page",
                  fan_count: 5000,
                  followers_count: 5500,
                  access_token: "page-token",
                },
              ],
            },
          }),
        },
        {
          match: (url) => url.includes("/page_123/insights"),
          respond: () => ({
            body: {
              data: [
                { name: "page_impressions", values: [{ value: 10000 }] },
                { name: "page_impressions_unique", values: [{ value: 6000 }] },
                { name: "page_engaged_users", values: [{ value: 800 }] },
              ],
            },
          }),
        },
        {
          match: (url) => url.includes("/page_123/posts"),
          respond: () => ({
            body: { data: [{ id: "p1" }, { id: "p2" }] },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/facebook/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.followerCount).toBe(5500);
    expect(res.body.totalViews).toBe(10000);
    expect(res.body.totalContent).toBe(2);
    expect(res.body.analyticsAvailable).toBe(true);
    expect(res.body.analyticsReason).toBe("ok");
    expect(res.body.normalized).toBeDefined();
  });

  it("falls back with analyticsReason=upstream_error when the provider call fails", async () => {
    tokenStore.rows = [
      makeToken({ platform: "facebook", connected: true, scope: "read_insights" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: () => true,
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });

    const res = await request(app).get("/api/facebook/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("upstream_error");
  });

  it("returns analyticsReason=insufficient_scope when the connected token lacks read_insights", async () => {
    tokenStore.rows = [
      makeToken({ platform: "facebook", connected: true, scope: "public_profile" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/me/accounts"),
          respond: () => ({
            body: {
              data: [{ id: "p1", name: "x", followers_count: 10 }],
            },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/facebook/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("insufficient_scope");
  });
});
