import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { YouTubeProvider, YOUTUBE_ANALYTICS_SCOPE } from "../YouTubeProvider.js";
import { encryptToken } from "../../utils/crypto.js";
import { installFetchMock } from "../../test/fetchMock.js";

describe("YouTubeProvider", () => {
  const provider = new YouTubeProvider();
  const encryptedToken = encryptToken("yt-access-token");

  let restoreFetch: () => void = () => {};

  afterEach(() => {
    restoreFetch();
  });

  describe("hasAnalyticsScope", () => {
    it("returns false for null/empty/missing scope strings", () => {
      expect(provider.hasAnalyticsScope(null)).toBe(false);
      expect(provider.hasAnalyticsScope(undefined)).toBe(false);
      expect(provider.hasAnalyticsScope("")).toBe(false);
      expect(provider.hasAnalyticsScope("openid email profile")).toBe(false);
    });

    it("returns true when the scope set includes the analytics scope", () => {
      expect(provider.hasAnalyticsScope(YOUTUBE_ANALYTICS_SCOPE)).toBe(true);
      expect(
        provider.hasAnalyticsScope(`openid ${YOUTUBE_ANALYTICS_SCOPE} profile`),
      ).toBe(true);
    });
  });

  describe("getChannelAnalytics", () => {
    it("returns unavailable=false when scope does not include analytics scope", async () => {
      // No fetch mock installed — this asserts there are no upstream calls.
      const { restore } = installFetchMock({ routes: [] });
      restoreFetch = restore;

      const result = await provider.getChannelAnalytics(encryptedToken, "openid email", 28);

      expect(result.available).toBe(false);
      expect(result.periodDays).toBe(28);
      expect(result.views).toBe(0);
      expect(result.watchTimeMinutes).toBe(0);
      expect(result.likes).toBe(0);
      expect(result.thumbnailImpressions).toBe(0);
      expect(result.thumbnailCtr).toBe(0);
    });

    it("returns unavailable=false when no encrypted token is provided", async () => {
      const { restore } = installFetchMock({ routes: [] });
      restoreFetch = restore;

      const result = await provider.getChannelAnalytics("", YOUTUBE_ANALYTICS_SCOPE, 7);

      expect(result.available).toBe(false);
      expect(result.periodDays).toBe(7);
    });

    it("merges the base report and ctr report when scope is granted", async () => {
      const { restore, calls } = installFetchMock({
        routes: [
          {
            match: (url) =>
              url.includes("youtubeanalytics.googleapis.com/v2/reports") &&
              url.includes("estimatedMinutesWatched"),
            respond: () => ({
              body: { rows: [[1000, 500, 120, 200, 5, 30, 10, 50, 2]] },
            }),
          },
          {
            match: (url) =>
              url.includes("youtubeanalytics.googleapis.com/v2/reports") &&
              url.includes("videoThumbnailImpressions"),
            respond: () => ({ body: { rows: [[5000, 0.045]] } }),
          },
        ],
      });
      restoreFetch = restore;

      const result = await provider.getChannelAnalytics(
        encryptedToken,
        YOUTUBE_ANALYTICS_SCOPE,
        28,
      );

      expect(result.available).toBe(true);
      expect(result.periodDays).toBe(28);
      expect(result.views).toBe(1000);
      expect(result.watchTimeMinutes).toBe(500);
      expect(result.averageViewDuration).toBe(120);
      expect(result.likes).toBe(200);
      expect(result.dislikes).toBe(5);
      expect(result.comments).toBe(30);
      expect(result.shares).toBe(10);
      expect(result.subscribersGained).toBe(50);
      expect(result.subscribersLost).toBe(2);
      expect(result.thumbnailImpressions).toBe(5000);
      expect(result.thumbnailCtr).toBeCloseTo(0.045);
      expect(calls.length).toBe(2);
    });

    it("returns analytics with zero metrics if base report rows are empty", async () => {
      const { restore } = installFetchMock({
        routes: [
          {
            match: (url) =>
              url.includes("/reports") && url.includes("estimatedMinutesWatched"),
            respond: () => ({ body: {} }),
          },
          {
            match: (url) =>
              url.includes("/reports") && url.includes("videoThumbnailImpressions"),
            respond: () => ({ body: {} }),
          },
        ],
      });
      restoreFetch = restore;

      const result = await provider.getChannelAnalytics(
        encryptedToken,
        YOUTUBE_ANALYTICS_SCOPE,
        14,
      );

      expect(result.available).toBe(true);
      expect(result.views).toBe(0);
      expect(result.thumbnailImpressions).toBe(0);
    });

    it("falls back to unavailable when the upstream analytics call throws", async () => {
      const { restore } = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("youtubeanalytics.googleapis.com"),
            respond: () => ({ status: 503, body: { error: "boom" } }),
          },
        ],
      });
      restoreFetch = restore;

      const result = await provider.getChannelAnalytics(
        encryptedToken,
        YOUTUBE_ANALYTICS_SCOPE,
        28,
      );

      expect(result.available).toBe(false);
      expect(result.views).toBe(0);
    });

    it("still succeeds when the optional CTR call fails", async () => {
      const { restore } = installFetchMock({
        routes: [
          {
            match: (url) =>
              url.includes("/reports") && url.includes("estimatedMinutesWatched"),
            respond: () => ({ body: { rows: [[10, 5, 1, 2, 0, 1, 0, 1, 0]] } }),
          },
          {
            match: (url) =>
              url.includes("/reports") && url.includes("videoThumbnailImpressions"),
            respond: () => ({ status: 500, body: {} }),
          },
        ],
      });
      restoreFetch = restore;

      const result = await provider.getChannelAnalytics(
        encryptedToken,
        YOUTUBE_ANALYTICS_SCOPE,
        28,
      );

      expect(result.available).toBe(true);
      expect(result.views).toBe(10);
      expect(result.thumbnailImpressions).toBe(0);
      expect(result.thumbnailCtr).toBe(0);
    });
  });

  describe("getNormalizedMetrics", () => {
    function channelStatsResponse() {
      return {
        items: [
          {
            id: "UC123",
            snippet: {
              title: "Test Channel",
              description: "A test channel",
              publishedAt: "2020-01-01T00:00:00Z",
              thumbnails: { default: { url: "https://example.com/t.jpg" } },
            },
            statistics: {
              subscriberCount: "1000",
              viewCount: "50000",
              videoCount: "42",
            },
          },
        ],
      };
    }

    it("uses analytics signal when scope is granted and analytics are available", async () => {
      const { restore } = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("youtube/v3/channels"),
            respond: () => ({ body: channelStatsResponse() }),
          },
          {
            match: (url) =>
              url.includes("/reports") && url.includes("estimatedMinutesWatched"),
            respond: () => ({
              body: { rows: [[2000, 800, 180, 100, 0, 20, 10, 30, 1]] },
            }),
          },
          {
            match: (url) =>
              url.includes("/reports") && url.includes("videoThumbnailImpressions"),
            respond: () => ({ body: { rows: [[10000, 0.07]] } }),
          },
        ],
      });
      restoreFetch = restore;

      const metrics = await provider.getNormalizedMetrics(
        encryptedToken,
        YOUTUBE_ANALYTICS_SCOPE,
        28,
      );

      expect(metrics.platform).toBe("youtube");
      expect(metrics.followers).toBe(1000);
      expect(metrics.totalViews).toBe(2000);
      expect(metrics.reach).toBe(2000);
      expect(metrics.watchTimeMinutes).toBe(800);
      expect(metrics.impressions).toBe(10000);
      expect(metrics.ctr).toBeCloseTo(0.07);
      expect(metrics.postsCount).toBe(42);
      expect(metrics.periodDays).toBe(28);
      // engagement = (likes + comments + shares) / views * 100 = (100+20+10)/2000 * 100
      expect(metrics.engagementRate).toBeCloseTo(6.5);
    });

    it("falls back to recent engagement averages when analytics are unavailable", async () => {
      const { restore } = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("youtube/v3/channels"),
            respond: () => ({ body: channelStatsResponse() }),
          },
          {
            match: (url) => url.includes("youtube/v3/search"),
            respond: () => ({
              body: {
                items: [
                  { id: { videoId: "v1" } },
                  { id: { videoId: "v2" } },
                ],
              },
            }),
          },
          {
            match: (url) => url.includes("youtube/v3/videos"),
            respond: () => ({
              body: {
                items: [
                  {
                    id: "v1",
                    snippet: { title: "A", publishedAt: "2025-01-01T00:00:00Z" },
                    statistics: { viewCount: "100", likeCount: "10", commentCount: "5" },
                  },
                  {
                    id: "v2",
                    snippet: { title: "B", publishedAt: "2025-01-02T00:00:00Z" },
                    statistics: { viewCount: "200", likeCount: "20", commentCount: "5" },
                  },
                ],
              },
            }),
          },
        ],
      });
      restoreFetch = restore;

      // No analytics scope -> getChannelAnalytics returns available=false,
      // so we should hit the recent-engagement fallback path.
      const metrics = await provider.getNormalizedMetrics(encryptedToken, "openid", 28);

      expect(metrics.platform).toBe("youtube");
      expect(metrics.followers).toBe(1000);
      expect(metrics.totalViews).toBe(50000);
      expect(metrics.reach).toBe(50000);
      // average engagement rate from recent: (40 / 300) * 100
      expect(metrics.engagementRate).toBeCloseTo((40 / 300) * 100);
      expect(metrics.impressions).toBe(0);
      expect(metrics.ctr).toBe(0);
      expect(metrics.watchTimeMinutes).toBe(0);
      expect(metrics.postsCount).toBe(42);
    });
  });

  describe("getChannelStats", () => {
    it("throws when the YouTube Data API returns no channel for an authenticated user", async () => {
      const { restore } = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("youtube/v3/channels"),
            respond: () => ({ body: { items: [] } }),
          },
        ],
      });
      restoreFetch = restore;

      await expect(provider.getChannelStats(encryptedToken)).rejects.toThrow(
        /no channel/i,
      );
    });

    it("returns mock data when no token is supplied", async () => {
      const { restore } = installFetchMock({ routes: [] });
      restoreFetch = restore;

      const stats = await provider.getChannelStats("");
      expect(stats.channelId).toBe("mock_channel_yt");
      expect(stats.subscribers).toBeGreaterThan(0);
    });
  });

  beforeEach(() => {
    restoreFetch = () => {};
  });
});
