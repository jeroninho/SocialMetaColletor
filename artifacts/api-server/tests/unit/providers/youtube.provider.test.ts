import { afterEach, describe, expect, it } from "vitest";
import {
  YouTubeProvider,
  YOUTUBE_ANALYTICS_SCOPE,
} from "../../../src/services/YouTubeProvider.js";
import { encryptToken } from "../../../src/utils/crypto.js";
import { HttpError } from "../../../src/utils/http.js";
import { installFetchMock } from "../../../src/test/fetchMock.js";

/**
 * Complementary scope-detection tests for YouTubeProvider. The deeper
 * data-fusion paths are covered in src/services/__tests__/YouTubeProvider.test.ts.
 */
describe("YouTubeProvider scope helpers", () => {
  const provider = new YouTubeProvider();

  it("hasAnalyticsScope detects the analytics scope only when present in the space-separated list", () => {
    expect(provider.hasAnalyticsScope(YOUTUBE_ANALYTICS_SCOPE)).toBe(true);
    expect(
      provider.hasAnalyticsScope(`openid email ${YOUTUBE_ANALYTICS_SCOPE}`),
    ).toBe(true);
    expect(
      provider.hasAnalyticsScope(`${YOUTUBE_ANALYTICS_SCOPE} https://www.googleapis.com/auth/youtube.readonly`),
    ).toBe(true);
    expect(provider.hasAnalyticsScope("openid")).toBe(false);
    expect(provider.hasAnalyticsScope(undefined)).toBe(false);
    expect(provider.hasAnalyticsScope(null)).toBe(false);
    expect(provider.hasAnalyticsScope("")).toBe(false);
  });

  describe("getRecentEngagement", () => {
    let restore: () => void = () => {};
    afterEach(() => restore());

    it("returns mock engagement when no token is supplied (unauthenticated path)", async () => {
      const installed = installFetchMock({ routes: [] });
      restore = installed.restore;

      const result = await provider.getRecentEngagement("");
      expect(result.videos.length).toBeGreaterThan(0);
      expect(result.totalEngagement).toBeGreaterThanOrEqual(0);
    });

    it("propagates upstream failures on the authenticated path so callers can react", async () => {
      const installed = installFetchMock({
        routes: [
          {
            match: () => true,
            respond: () => ({ status: 500, body: { error: "boom" } }),
          },
        ],
      });
      restore = installed.restore;

      const token = encryptToken("yt-token");
      await expect(provider.getRecentEngagement(token)).rejects.toThrow(/HTTP 500/);
    });

    it("returns an empty engagement set when the upstream search has no items", async () => {
      const installed = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("/search"),
            respond: () => ({ body: { items: [] } }),
          },
        ],
      });
      restore = installed.restore;

      const token = encryptToken("yt-token-2");
      const result = await provider.getRecentEngagement(token);
      expect(result.videos).toEqual([]);
      expect(result.totalEngagement).toBe(0);
      expect(result.averageEngagementRate).toBe(0);
    });
  });

  describe("401 path surfaces typed HttpError", () => {
    let restore: () => void = () => {};
    afterEach(() => restore());

    it("getChannelStats throws HttpError with status=401 when the bearer is rejected", async () => {
      const installed = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("youtube/v3/channels"),
            respond: () => ({ status: 401, body: { error: { code: 401, message: "Invalid Credentials" } } }),
          },
        ],
      });
      restore = installed.restore;

      const err = await provider.getChannelStats(encryptToken("yt-expired")).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(401);
      expect((err as HttpError).name).toBe("HttpError");
    });

    it("getRecentEngagement throws HttpError on 401 (not a generic Error)", async () => {
      const installed = installFetchMock({
        routes: [
          { match: () => true, respond: () => ({ status: 401, body: { error: { code: 401 } } }) },
        ],
      });
      restore = installed.restore;

      const err = await provider.getRecentEngagement(encryptToken("yt-revoked")).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(401);
    });

    it("getChannelAnalytics degrades to available=false on 401 (graceful fallback)", async () => {
      const installed = installFetchMock({
        routes: [
          {
            match: (url) => url.includes("youtubeanalytics.googleapis.com"),
            respond: () => ({ status: 401, body: {} }),
          },
        ],
      });
      restore = installed.restore;

      const result = await provider.getChannelAnalytics(
        encryptToken("yt-revoked-analytics"),
        YOUTUBE_ANALYTICS_SCOPE,
        28,
      );
      expect(result.available).toBe(false);
      expect(result.views).toBe(0);
    });
  });
});
