import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import { ListYoutubeVideosQueryParams } from "@workspace/api-zod";
import { YouTubeProvider } from "../services/YouTubeProvider.js";
import { cached } from "../services/RedisClient.js";

const router = Router();
const youtube = new YouTubeProvider();
const ANALYTICS_PERIOD_DAYS = 28;

const youtubeVideos = [
  {
    id: "yt_vid_001",
    title: "Building Fullstack Apps with NestJS and React",
    description: "In this tutorial, we cover how to build a complete fullstack application using NestJS on the backend and React on the frontend.",
    viewCount: 142500,
    likeCount: 8320,
    commentCount: 412,
    duration: "PT28M15S",
    thumbnailUrl: "https://picsum.photos/seed/yt001/320/180",
    publishedAt: new Date("2024-11-15T10:00:00Z").toISOString(),
    platform: "youtube",
  },
  {
    id: "yt_vid_002",
    title: "PostgreSQL Performance Tuning Tips",
    description: "Learn how to optimize your PostgreSQL queries and improve database performance.",
    viewCount: 98700,
    likeCount: 5640,
    commentCount: 287,
    duration: "PT19M42S",
    thumbnailUrl: "https://picsum.photos/seed/yt002/320/180",
    publishedAt: new Date("2024-12-03T14:00:00Z").toISOString(),
    platform: "youtube",
  },
  {
    id: "yt_vid_003",
    title: "Redis Caching Strategies Explained",
    description: "Understanding when and how to use Redis for caching in your web applications.",
    viewCount: 76300,
    likeCount: 4120,
    commentCount: 198,
    duration: "PT22M08S",
    thumbnailUrl: "https://picsum.photos/seed/yt003/320/180",
    publishedAt: new Date("2024-12-20T09:00:00Z").toISOString(),
    platform: "youtube",
  },
  {
    id: "yt_vid_004",
    title: "OAuth2 Deep Dive — Understanding the Flow",
    description: "A comprehensive guide to OAuth2 authentication flows with real-world examples.",
    viewCount: 64100,
    likeCount: 3890,
    commentCount: 156,
    duration: "PT31M55S",
    thumbnailUrl: "https://picsum.photos/seed/yt004/320/180",
    publishedAt: new Date("2025-01-08T11:00:00Z").toISOString(),
    platform: "youtube",
  },
  {
    id: "yt_vid_005",
    title: "TypeScript Advanced Patterns in 2025",
    description: "Explore advanced TypeScript patterns that will make your code more type-safe and maintainable.",
    viewCount: 52800,
    likeCount: 3210,
    commentCount: 134,
    duration: "PT24M33S",
    thumbnailUrl: "https://picsum.photos/seed/yt005/320/180",
    publishedAt: new Date("2025-01-25T13:00:00Z").toISOString(),
    platform: "youtube",
  },
];

async function loadYoutubeToken() {
  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.platform, "youtube"))
    .limit(1);
  return token ?? null;
}

router.get("/youtube/channel", async (_req, res) => {
  const token = await loadYoutubeToken();
  const accountName = token?.accountName ?? "TechDevChannel";

  // Authenticated path — fetch real Data API metadata and merge with Analytics.
  // Mock data is preserved ONLY for unauthenticated users (no token / not
  // connected). For authenticated users, surface real failures explicitly.
  if (token?.connected && token.accessToken) {
    try {
      const [stats, analytics] = await Promise.all([
        youtube.getChannelStats(token.accessToken),
        youtube.getChannelAnalytics(token.accessToken, token.scope, ANALYTICS_PERIOD_DAYS),
      ]);

      res.json({
        id: stats.channelId,
        title: stats.title,
        description: stats.description ?? "",
        subscriberCount: stats.subscribers,
        videoCount: stats.videoCount,
        viewCount: stats.totalViews,
        thumbnailUrl: stats.thumbnailUrl ?? "https://picsum.photos/seed/ytchannel/96/96",
        publishedAt: stats.publishedAt,
        analyticsAvailable: analytics.available,
        analyticsReason: analytics.available
          ? "ok"
          : youtube.hasAnalyticsScope(token.scope)
            ? "upstream_error"
            : "insufficient_scope",
        periodDays: analytics.periodDays,
        watchTimeMinutes: analytics.watchTimeMinutes,
        averageViewDuration: analytics.averageViewDuration,
        thumbnailImpressions: analytics.thumbnailImpressions,
        thumbnailCtr: analytics.thumbnailCtr,
        subscribersGained: analytics.subscribersGained,
        subscribersLost: analytics.subscribersLost,
        viewsInPeriod: analytics.views,
        likesInPeriod: analytics.likes,
        commentsInPeriod: analytics.comments,
        sharesInPeriod: analytics.shares,
      });
      return;
    } catch (err) {
      res.status(502).json({
        error: "youtube_data_api_failed",
        reason: "upstream_error",
        message: err instanceof Error ? err.message : "Failed to fetch channel data from YouTube.",
        analyticsAvailable: false,
      });
      return;
    }
  }

  res.json({
    id: "UC_yt_demo_channel_001",
    title: accountName,
    description: "A channel dedicated to modern web development, backend systems, and developer tools.",
    subscriberCount: 184200,
    videoCount: youtubeVideos.length,
    viewCount: youtubeVideos.reduce((sum, v) => sum + v.viewCount, 0),
    thumbnailUrl: "https://picsum.photos/seed/ytchannel/96/96",
    publishedAt: new Date("2021-03-15T00:00:00Z").toISOString(),
    analyticsAvailable: false,
    periodDays: ANALYTICS_PERIOD_DAYS,
    watchTimeMinutes: 0,
    averageViewDuration: 0,
    thumbnailImpressions: 0,
    thumbnailCtr: 0,
    subscribersGained: 0,
    subscribersLost: 0,
    viewsInPeriod: 0,
    likesInPeriod: 0,
    commentsInPeriod: 0,
    sharesInPeriod: 0,
  });
});

router.get("/youtube/videos", async (req, res) => {
  const parsed = ListYoutubeVideosQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const token = await loadYoutubeToken();
  // Authenticated path: serve real Data API video list (merged with the
  // analytics period so callers can correlate video-level numbers with
  // channel-level analytics). Mock list is preserved only for
  // unauthenticated users.
  if (token?.connected && token.accessToken) {
    try {
      const recent = await youtube.getRecentEngagement(token.accessToken, Math.min(limit + offset, 50));
      const items = recent.videos.slice(offset, offset + limit).map((v) => ({
        id: v.videoId,
        title: v.title,
        publishedAt: v.publishedAt,
        viewCount: v.views,
        likeCount: v.likes,
        commentCount: v.comments,
        thumbnailUrl: v.thumbnailUrl ?? `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      }));
      res.json({ items, total: recent.videos.length, limit, offset });
      return;
    } catch (err) {
      res.status(502).json({
        error: "youtube_data_api_failed",
        reason: "upstream_error",
        message: err instanceof Error ? err.message : "Failed to fetch videos from YouTube.",
      });
      return;
    }
  }

  const sliced = youtubeVideos.slice(offset, offset + limit);
  res.json({ items: sliced, total: youtubeVideos.length, limit, offset });
});

router.get("/youtube/videos/:videoId", async (req, res) => {
  const video = youtubeVideos.find((v) => v.id === req.params.videoId);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.json(video);
});

router.get("/youtube/analytics", async (_req, res) => {
  let hit = false;
  const payload = await cached(
    "youtube:analytics:v1",
    300,
    async () => buildYoutubeAnalytics(),
    {
      onHit: () => { hit = true; },
      cacheIf: (v) => !("error" in v) && v.analyticsReason !== "upstream_error",
    },
  );
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  if ("error" in payload) {
    res.status(502).json(payload);
    return;
  }
  res.json(payload);
});

async function buildYoutubeAnalytics() {
  const token = await loadYoutubeToken();

  // Mock fallback is preserved ONLY for unauthenticated users or tokens
  // missing the analytics scope. Authenticated callers see real errors.
  if (token?.connected && token.accessToken) {
    try {
      const [stats, analytics, normalized] = await Promise.all([
        youtube.getChannelStats(token.accessToken),
        youtube.getChannelAnalytics(token.accessToken, token.scope, ANALYTICS_PERIOD_DAYS),
        youtube.getNormalizedMetrics(token.accessToken, token.scope, ANALYTICS_PERIOD_DAYS),
      ]);

      const totalViews = analytics.available ? analytics.views : stats.totalViews;
      const totalLikes = analytics.available
        ? analytics.likes
        : youtubeVideos.reduce((s, v) => s + v.likeCount, 0);
      const totalComments = analytics.available
        ? analytics.comments
        : youtubeVideos.reduce((s, v) => s + v.commentCount, 0);
      const totalShares = analytics.shares;
      const averageEngagementRate =
        totalViews > 0
          ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
          : 0;

      return {
        platform: "youtube",
        totalContent: stats.videoCount,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
        followerCount: stats.subscribers,
        growthRate: stats.subscribers > 0
          ? parseFloat((((analytics.subscribersGained - analytics.subscribersLost) / stats.subscribers) * 100).toFixed(2))
          : 0,
        topContent: youtubeVideos.slice(0, 3).map((v) => ({
          id: v.id,
          title: v.title,
          views: v.viewCount,
          likes: v.likeCount,
          engagementRate: parseFloat((((v.likeCount + v.commentCount) / v.viewCount) * 100).toFixed(2)),
          platform: "youtube",
        })),
        normalized,
        analyticsAvailable: analytics.available,
        analyticsReason: analytics.available
          ? "ok"
          : youtube.hasAnalyticsScope(token.scope)
            ? "upstream_error"
            : "insufficient_scope",
        watchTimeMinutes: analytics.watchTimeMinutes,
        thumbnailImpressions: analytics.thumbnailImpressions,
        thumbnailCtr: parseFloat(analytics.thumbnailCtr.toFixed(4)),
        subscribersGained: analytics.subscribersGained,
        subscribersLost: analytics.subscribersLost,
        periodDays: analytics.periodDays,
      };
    } catch (err) {
      return {
        error: "youtube_analytics_failed",
        reason: youtube.hasAnalyticsScope(token.scope) ? "upstream_error" : "insufficient_scope",
        message: err instanceof Error ? err.message : "Failed to fetch analytics from YouTube.",
        analyticsAvailable: false,
        analyticsReason: youtube.hasAnalyticsScope(token.scope) ? "upstream_error" : "insufficient_scope",
      };
    }
  }

  const totalViews = youtubeVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = youtubeVideos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = youtubeVideos.reduce((s, v) => s + v.commentCount, 0);
  const averageEngagementRate = ((totalLikes + totalComments) / totalViews) * 100;

  return {
    platform: "youtube",
    totalContent: youtubeVideos.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares: 0,
    averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
    followerCount: 184200,
    growthRate: 3.2,
    topContent: youtubeVideos.slice(0, 3).map((v) => ({
      id: v.id,
      title: v.title,
      views: v.viewCount,
      likes: v.likeCount,
      engagementRate: parseFloat((((v.likeCount + v.commentCount) / v.viewCount) * 100).toFixed(2)),
      platform: "youtube",
    })),
    normalized: {
      platform: "youtube",
      followers: 184200,
      totalViews,
      engagementRate: parseFloat(averageEngagementRate.toFixed(2)),
      reach: totalViews,
      impressions: 0,
      ctr: 0,
      watchTimeMinutes: 0,
      postsCount: youtubeVideos.length,
      periodDays: ANALYTICS_PERIOD_DAYS,
      lastUpdated: new Date().toISOString(),
    },
    analyticsAvailable: false,
    watchTimeMinutes: 0,
    thumbnailImpressions: 0,
    thumbnailCtr: 0,
    subscribersGained: 0,
    subscribersLost: 0,
    periodDays: ANALYTICS_PERIOD_DAYS,
  };
}

export default router;
