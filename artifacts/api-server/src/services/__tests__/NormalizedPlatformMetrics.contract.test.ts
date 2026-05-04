import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  YouTubeProvider,
  YOUTUBE_ANALYTICS_SCOPE,
  type NormalizedPlatformMetrics,
} from "../YouTubeProvider.js";
import { MetaProvider, FACEBOOK_INSIGHTS_SCOPE } from "../MetaProvider.js";
import { TikTokProvider, TIKTOK_VIDEO_LIST_SCOPE } from "../TikTokProvider.js";
import { TwitterProvider, TWITTER_TWEET_READ_SCOPE } from "../TwitterProvider.js";
import { encryptToken } from "../../utils/crypto.js";
import { installFetchMock } from "../../test/fetchMock.js";

const NormalizedPlatformMetricsSchema = z.object({
  platform: z.string().min(1),
  followers: z.number().int().nonnegative(),
  totalViews: z.number().nonnegative(),
  engagementRate: z.number().nonnegative(),
  reach: z.number().nonnegative(),
  impressions: z.number().nonnegative(),
  ctr: z.number().nonnegative(),
  watchTimeMinutes: z.number().nonnegative(),
  postsCount: z.number().int().nonnegative(),
  periodDays: z.number().int().positive(),
  lastUpdated: z.string().min(1),
});

function assertContract(metrics: NormalizedPlatformMetrics, expectedPlatform: string) {
  const parsed = NormalizedPlatformMetricsSchema.safeParse(metrics);
  expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(
    true,
  );
  expect(metrics.platform).toBe(expectedPlatform);
  // lastUpdated must be a parseable ISO date.
  expect(Number.isNaN(Date.parse(metrics.lastUpdated))).toBe(false);
}

describe("NormalizedPlatformMetrics contract", () => {
  const encrypted = encryptToken("provider-test-token");
  let restoreFetch: () => void = () => {};
  afterEach(() => restoreFetch());

  it("YouTubeProvider returns a valid NormalizedPlatformMetrics object", async () => {
    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube/v3/channels"),
          respond: () => ({
            body: {
              items: [
                {
                  id: "UC1",
                  snippet: { title: "C", description: "", publishedAt: "2020-01-01T00:00:00Z" },
                  statistics: { subscriberCount: "10", viewCount: "100", videoCount: "3" },
                },
              ],
            },
          }),
        },
        {
          match: (url) => url.includes("/reports") && url.includes("estimatedMinutesWatched"),
          respond: () => ({ body: { rows: [[100, 50, 30, 10, 0, 5, 1, 2, 0]] } }),
        },
        {
          match: (url) => url.includes("/reports") && url.includes("videoThumbnailImpressions"),
          respond: () => ({ body: { rows: [[500, 0.02]] } }),
        },
      ],
    });
    restoreFetch = restore;

    const youtube = new YouTubeProvider();
    const metrics = await youtube.getNormalizedMetrics(
      encrypted,
      YOUTUBE_ANALYTICS_SCOPE,
      28,
    );
    assertContract(metrics, "youtube");
    expect(metrics.watchTimeMinutes).toBe(50);
  });

  it("MetaProvider.getFacebookNormalizedMetrics returns a valid object", async () => {
    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/me/accounts"),
          respond: () => ({
            body: {
              data: [
                {
                  id: "page1",
                  name: "Page",
                  fan_count: 200,
                  followers_count: 250,
                  access_token: "page_token",
                },
              ],
            },
          }),
        },
        {
          match: (url) => url.includes("/insights"),
          respond: () => ({
            body: {
              data: [
                { name: "page_impressions", values: [{ value: 1000 }] },
                { name: "page_impressions_unique", values: [{ value: 700 }] },
                { name: "page_engaged_users", values: [{ value: 50 }] },
              ],
            },
          }),
        },
        {
          match: (url) => url.includes("/posts"),
          respond: () => ({ body: { data: [{ id: "p1" }, { id: "p2" }] } }),
        },
      ],
    });
    restoreFetch = restore;

    const meta = new MetaProvider();
    const metrics = await meta.getFacebookNormalizedMetrics(
      encrypted,
      FACEBOOK_INSIGHTS_SCOPE,
      28,
    );
    assertContract(metrics, "facebook");
    expect(metrics.followers).toBe(250);
    expect(metrics.impressions).toBe(1000);
    expect(metrics.reach).toBe(700);
    expect(metrics.postsCount).toBe(2);
  });

  it("MetaProvider.getInstagramNormalizedMetrics returns a valid object", async () => {
    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.startsWith("https://graph.instagram.com/me?"),
          respond: () => ({ body: { id: "ig1", username: "u", media_count: 12 } }),
        },
        {
          match: (url) => url.startsWith("https://graph.instagram.com/me/media"),
          respond: () => ({
            body: {
              data: [
                {
                  id: "m1",
                  like_count: 30,
                  comments_count: 5,
                  timestamp: new Date().toISOString(),
                },
              ],
            },
          }),
        },
      ],
    });
    restoreFetch = restore;

    const meta = new MetaProvider();
    // Without insights scope the Basic Display path runs.
    const metrics = await meta.getInstagramNormalizedMetrics(encrypted, null, 28);
    assertContract(metrics, "instagram");
    expect(metrics.totalViews).toBe(35);
    expect(metrics.postsCount).toBeGreaterThan(0);
  });

  it("TikTokProvider returns a valid object", async () => {
    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/user/info/"),
          respond: () => ({
            body: {
              data: {
                user: {
                  open_id: "tt1",
                  username: "tiktoker",
                  display_name: "Tik",
                  follower_count: 500,
                  following_count: 10,
                  likes_count: 1000,
                  video_count: 7,
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
                    view_count: 1000,
                    like_count: 100,
                    comment_count: 10,
                    share_count: 5,
                    create_time: Math.floor(Date.now() / 1000),
                  },
                ],
              },
            },
          }),
        },
      ],
    });
    restoreFetch = restore;

    const tiktok = new TikTokProvider();
    const metrics = await tiktok.getNormalizedMetrics(
      encrypted,
      TIKTOK_VIDEO_LIST_SCOPE,
      28,
    );
    assertContract(metrics, "tiktok");
    expect(metrics.followers).toBe(500);
    expect(metrics.totalViews).toBe(1000);
    expect(metrics.engagementRate).toBeCloseTo((115 / 1000) * 100);
  });

  it("TwitterProvider returns a valid object", async () => {
    const userId = "tw1";
    const { restore } = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("/users/me"),
          respond: () => ({
            body: {
              data: {
                id: userId,
                username: "tweeter",
                name: "Tweeter",
                public_metrics: {
                  followers_count: 800,
                  following_count: 100,
                  tweet_count: 250,
                  listed_count: 5,
                },
              },
            },
          }),
        },
        {
          match: (url) => url.includes(`/users/${userId}/tweets`),
          respond: () => ({
            body: {
              data: [
                {
                  id: "t1",
                  text: "hi",
                  created_at: new Date().toISOString(),
                  public_metrics: {
                    like_count: 20,
                    retweet_count: 5,
                    reply_count: 2,
                    quote_count: 1,
                    impression_count: 1000,
                  },
                },
              ],
            },
          }),
        },
      ],
    });
    restoreFetch = restore;

    const twitter = new TwitterProvider();
    const metrics = await twitter.getNormalizedMetrics(
      encrypted,
      TWITTER_TWEET_READ_SCOPE,
      28,
    );
    assertContract(metrics, "twitter");
    expect(metrics.followers).toBe(800);
    expect(metrics.impressions).toBe(1000);
    expect(metrics.engagementRate).toBeCloseTo((28 / 1000) * 100);
  });
});
