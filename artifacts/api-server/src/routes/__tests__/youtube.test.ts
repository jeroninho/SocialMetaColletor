import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { encryptToken } from "../../utils/crypto.js";
import { YOUTUBE_ANALYTICS_SCOPE } from "../../services/YouTubeProvider.js";
import { installFetchMock } from "../../test/fetchMock.js";

interface FakeToken {
  platform: string;
  accountName: string;
  accessToken: string;
  scope: string | null;
  connected: boolean;
}

const tokenStore: { youtube: FakeToken | null } = { youtube: null };

vi.mock("@workspace/db", async () => {
  const actual =
    await vi.importActual<typeof import("@workspace/db")>("@workspace/db");

  function makeChain<T>(rows: T[]) {
    const chain = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: async () => rows,
      then: (onFulfilled: (rows: T[]) => unknown) =>
        Promise.resolve(rows).then(onFulfilled),
    };
    return chain;
  }

  const fakeDb = {
    select: () => {
      const t = tokenStore.youtube;
      return makeChain(t ? [t] : []);
    },
    insert: () => ({ values: async () => undefined }),
  };

  return {
    ...actual,
    db: fakeDb,
  };
});

let app: Express;

beforeAll(async () => {
  const { default: youtubeRouter } = await import("../youtube.js");
  app = express();
  app.use(express.json());
  app.use("/api", youtubeRouter);
});

afterEach(() => {
  tokenStore.youtube = null;
});

describe("GET /api/youtube/channel", () => {
  let restoreFetch: () => void = () => {};
  afterAll(() => restoreFetch());

  it("returns mock channel data with analyticsAvailable=false when not connected", async () => {
    const { restore } = installFetchMock({ routes: [] });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/channel");
    restore();

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("UC_yt_demo_channel_001");
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.subscribersGained).toBe(0);
  });

  it("merges Data API + Analytics for connected accounts with the analytics scope", async () => {
    tokenStore.youtube = {
      platform: "youtube",
      accountName: "Real Channel",
      accessToken: encryptToken("yt-real-token"),
      scope: `openid ${YOUTUBE_ANALYTICS_SCOPE}`,
      connected: true,
    };

    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({
            body: {
              items: [
                {
                  id: "UC_real",
                  snippet: {
                    title: "Real Channel",
                    description: "desc",
                    publishedAt: "2021-01-01T00:00:00Z",
                    thumbnails: { default: { url: "https://img/t.jpg" } },
                  },
                  statistics: {
                    subscriberCount: "5000",
                    viewCount: "200000",
                    videoCount: "75",
                  },
                },
              ],
            },
          }),
        },
        {
          match: (url) =>
            url.includes("/reports") && url.includes("estimatedMinutesWatched"),
          respond: () => ({
            body: { rows: [[3000, 1500, 240, 250, 0, 30, 12, 80, 5]] },
          }),
        },
        {
          match: (url) =>
            url.includes("/reports") && url.includes("videoThumbnailImpressions"),
          respond: () => ({ body: { rows: [[20000, 0.06]] } }),
        },
      ],
    });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/channel");
    restore();

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("UC_real");
    expect(res.body.title).toBe("Real Channel");
    expect(res.body.subscriberCount).toBe(5000);
    expect(res.body.videoCount).toBe(75);
    expect(res.body.viewCount).toBe(200000);
    expect(res.body.analyticsAvailable).toBe(true);
    expect(res.body.analyticsReason).toBe("ok");
    expect(res.body.watchTimeMinutes).toBe(1500);
    expect(res.body.thumbnailImpressions).toBe(20000);
    expect(res.body.subscribersGained).toBe(80);
    expect(res.body.subscribersLost).toBe(5);
  });

  it("flags analyticsReason=insufficient_scope when the analytics scope is missing", async () => {
    tokenStore.youtube = {
      platform: "youtube",
      accountName: "Channel No Scope",
      accessToken: encryptToken("yt-token"),
      scope: "openid email",
      connected: true,
    };

    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({
            body: {
              items: [
                {
                  id: "UC_ns",
                  snippet: { title: "NS", description: "", publishedAt: "2024-01-01T00:00:00Z" },
                  statistics: { subscriberCount: "100", viewCount: "1000", videoCount: "10" },
                },
              ],
            },
          }),
        },
      ],
    });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/channel");
    restore();

    expect(res.status).toBe(200);
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.analyticsReason).toBe("insufficient_scope");
    expect(res.body.subscriberCount).toBe(100);
  });

  it("returns 502 when the YouTube Data API fails for a connected account", async () => {
    tokenStore.youtube = {
      platform: "youtube",
      accountName: "Channel",
      accessToken: encryptToken("yt-token"),
      scope: YOUTUBE_ANALYTICS_SCOPE,
      connected: true,
    };

    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/channel");
    restore();

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("youtube_data_api_failed");
    expect(res.body.analyticsAvailable).toBe(false);
  });
});

describe("GET /api/youtube/analytics", () => {
  let restoreFetch: () => void = () => {};
  afterAll(() => restoreFetch());

  it("returns mock analytics with analyticsAvailable=false when not connected", async () => {
    const { restore } = installFetchMock({ routes: [] });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/analytics");
    restore();

    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("youtube");
    expect(res.body.analyticsAvailable).toBe(false);
    expect(res.body.normalized).toMatchObject({ platform: "youtube" });
  });

  it("fuses Data API + Analytics + normalized metrics for connected accounts", async () => {
    tokenStore.youtube = {
      platform: "youtube",
      accountName: "Real",
      accessToken: encryptToken("yt-token"),
      scope: YOUTUBE_ANALYTICS_SCOPE,
      connected: true,
    };

    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({
            body: {
              items: [
                {
                  id: "UC_real",
                  snippet: { title: "Real", description: "", publishedAt: "2020-01-01T00:00:00Z" },
                  statistics: {
                    subscriberCount: "10000",
                    viewCount: "1000000",
                    videoCount: "120",
                  },
                },
              ],
            },
          }),
        },
        {
          match: (url) =>
            url.includes("/reports") && url.includes("estimatedMinutesWatched"),
          respond: () => ({
            body: { rows: [[5000, 2000, 240, 400, 0, 50, 25, 100, 10]] },
          }),
        },
        {
          match: (url) =>
            url.includes("/reports") && url.includes("videoThumbnailImpressions"),
          respond: () => ({ body: { rows: [[40000, 0.08]] } }),
        },
      ],
    });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/analytics");
    restore();

    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("youtube");
    expect(res.body.analyticsAvailable).toBe(true);
    expect(res.body.analyticsReason).toBe("ok");
    expect(res.body.totalContent).toBe(120);
    expect(res.body.totalViews).toBe(5000); // analytics views, not stats viewCount
    expect(res.body.totalLikes).toBe(400);
    expect(res.body.totalComments).toBe(50);
    expect(res.body.totalShares).toBe(25);
    expect(res.body.followerCount).toBe(10000);
    expect(res.body.watchTimeMinutes).toBe(2000);
    expect(res.body.thumbnailImpressions).toBe(40000);
    expect(res.body.subscribersGained).toBe(100);
    // growth rate = (gained - lost) / followers * 100 = 90/10000 * 100
    expect(res.body.growthRate).toBeCloseTo(0.9);
    // normalized contract sanity
    expect(res.body.normalized).toMatchObject({
      platform: "youtube",
      followers: 10000,
      totalViews: 5000,
    });
  });

  it("returns 502 with insufficient_scope reason when analytics fails and scope is missing", async () => {
    tokenStore.youtube = {
      platform: "youtube",
      accountName: "Real",
      accessToken: encryptToken("yt-token"),
      scope: "openid",
      connected: true,
    };

    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });
    restoreFetch = restore;

    const res = await request(app).get("/api/youtube/analytics");
    restore();

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("youtube_analytics_failed");
    expect(res.body.analyticsReason).toBe("insufficient_scope");
  });
});
