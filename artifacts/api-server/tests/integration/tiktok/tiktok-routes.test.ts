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

describe("GET /api/tiktok/profile", () => {
  it("returns the default profile when no token is connected", async () => {
    const res = await request(app).get("/api/tiktok/profile");
    expect(res.status).toBe(200);
    expect(res.body.uniqueId).toBe("techdevstudio");
    expect(res.body).toHaveProperty("followerCount");
  });

  it("uses the stored account name when a token row exists", async () => {
    tokenStore.rows = [makeToken({ platform: "tiktok", accountName: "ttuser" })];
    const res = await request(app).get("/api/tiktok/profile");
    expect(res.status).toBe(200);
    expect(res.body.uniqueId).toBe("ttuser");
  });
});

describe("GET /api/tiktok/videos", () => {
  it("returns the default video listing", async () => {
    const res = await request(app).get("/api/tiktok/videos");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });

  it("respects limit and offset query params", async () => {
    const res = await request(app).get("/api/tiktok/videos?limit=2&offset=1");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });
});

describe("GET /api/tiktok/analytics", () => {
  it("returns analyticsReason=not_connected when no token row exists", async () => {
    const res = await request(app).get("/api/tiktok/analytics");
    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("tiktok");
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns analyticsReason=not_connected when the token is disconnected", async () => {
    tokenStore.rows = [
      makeToken({ platform: "tiktok", connected: false, scope: "video.list" }),
    ];
    const res = await request(app).get("/api/tiktok/analytics");
    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("not_connected");
  });

  it("returns normalized analytics from the provider on the happy path", async () => {
    tokenStore.rows = [
      makeToken({ platform: "tiktok", connected: true, scope: "video.list" }),
    ];

    const recentSec = Math.floor((Date.now() - 86400_000) / 1000);
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/user/info/"),
          respond: () => ({
            body: {
              data: {
                user: {
                  open_id: "tt-user-1",
                  username: "tiktok_user",
                  display_name: "TT User",
                  follower_count: 1234,
                  following_count: 10,
                  likes_count: 9999,
                  video_count: 5,
                },
              },
            },
          }),
        },
        {
          match: (url) => url.includes("/video/list/"),
          respond: () => ({
            body: {
              data: {
                videos: [
                  {
                    id: "v1",
                    title: "x",
                    view_count: 1000,
                    like_count: 100,
                    comment_count: 5,
                    share_count: 2,
                    create_time: recentSec,
                  },
                  {
                    id: "v2",
                    title: "y",
                    view_count: 500,
                    like_count: 50,
                    comment_count: 1,
                    share_count: 0,
                    create_time: recentSec,
                  },
                ],
              },
            },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/tiktok/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.followerCount).toBe(1234);
    expect(res.body.totalViews).toBe(1500);
    expect(res.body.totalContent).toBe(2);
    expect(res.body.analyticsAvailable).toBe(true);
    expect(res.body.analyticsReason).toBe("ok");
  });

  it("falls back with analyticsReason=upstream_error when the provider call fails", async () => {
    tokenStore.rows = [
      makeToken({ platform: "tiktok", connected: true, scope: "video.list" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: () => true,
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });

    const res = await request(app).get("/api/tiktok/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("upstream_error");
  });

  it("returns analyticsReason=insufficient_scope when the connected token lacks video.list", async () => {
    tokenStore.rows = [
      makeToken({ platform: "tiktok", connected: true, scope: "user.info.basic" }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/user/info/"),
          respond: () => ({
            body: {
              data: {
                user: {
                  open_id: "tt-user-1",
                  username: "u",
                  display_name: "U",
                  follower_count: 50,
                  following_count: 0,
                  likes_count: 0,
                  video_count: 0,
                },
              },
            },
          }),
        },
      ],
    });

    const res = await request(app).get("/api/tiktok/analytics");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("insufficient_scope");
  });
});
