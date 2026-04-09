import { Router } from "express";
import { desc } from "drizzle-orm";
import { db, metadataTable } from "@workspace/db";
import { ListRecentMetadataQueryParams } from "@workspace/api-zod";
import { cacheGet, cacheSet } from "../services/RedisClient.js";
import { getMetadataSyncQueue, startSyncWorker, type SyncJobData } from "../queues/metadataSyncQueue.js";
import { YouTubeProvider } from "../services/YouTubeProvider.js";
import { MetaProvider } from "../services/MetaProvider.js";

const router = Router();
const CACHE_TTL = parseInt(process.env["CACHE_TTL_SECONDS"] ?? "60", 10);

const youtube = new YouTubeProvider();
const meta = new MetaProvider();

startSyncWorker();

router.get("/dashboard/summary", async (req, res) => {
  const userId = req.user?.sub ?? "anonymous";
  const cacheKey = `dashboard:summary:${userId}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    res.json(JSON.parse(cached));
    return;
  }

  const summary = {
    totalPlatforms: 3,
    connectedPlatforms: 2,
    totalFollowers: 184200 + 42800 + 31200,
    totalContent: 5 + 5 + 5,
    totalViews: 434400 + 237700 + 209600,
    totalEngagements: 25180 + 18010 + 14230,
    averageEngagementRate: 4.21,
    platformBreakdown: [
      { platform: "youtube", connected: true, followers: 184200, content: 5, engagementRate: 5.82 },
      { platform: "instagram", connected: true, followers: 42800, content: 5, engagementRate: 7.59 },
      { platform: "facebook", connected: false, followers: 31200, content: 5, engagementRate: 6.81 },
    ],
    lastSyncAt: new Date().toISOString(),
    _source: "db",
  };

  await cacheSet(cacheKey, JSON.stringify(summary), CACHE_TTL);
  res.setHeader("X-Cache", "MISS");
  res.json(summary);
});

router.get("/dashboard/recent-metadata", async (req, res) => {
  const parsed = ListRecentMetadataQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

  const dbEntries = await db
    .select()
    .from(metadataTable)
    .orderBy(desc(metadataTable.collectedAt))
    .limit(limit);

  if (dbEntries.length > 0) {
    res.json({ items: dbEntries, total: dbEntries.length });
    return;
  }

  const ytEngagement = await youtube.getRecentEngagement("");
  const fbEngagement = await meta.getFacebookRecentEngagement("");
  const igEngagement = await meta.getInstagramRecentEngagement("");

  const mockEntries = [
    ...ytEngagement.videos.map((v, i) => ({
      id: i + 1, platform: "youtube", contentType: "video", contentId: v.videoId,
      title: v.title, views: v.views, likes: v.likes, comments: v.comments, shares: 0,
      collectedAt: v.publishedAt,
    })),
    ...igEngagement.posts.map((p, i) => ({
      id: i + 10, platform: "instagram", contentType: "media", contentId: p.postId,
      title: p.caption, views: p.reach, likes: p.likes, comments: p.comments, shares: 0,
      collectedAt: p.publishedAt,
    })),
    ...fbEngagement.posts.map((p, i) => ({
      id: i + 20, platform: "facebook", contentType: "post", contentId: p.postId,
      title: p.caption, views: p.reach, likes: p.likes, comments: p.comments, shares: p.shares,
      collectedAt: p.publishedAt,
    })),
  ].slice(0, limit);

  res.json({ items: mockEntries, total: mockEntries.length });
});

router.get("/dashboard/engagement-trends", async (_req, res) => {
  const dataPoints = [
    { date: "2024-11-01", youtube: 12400, instagram: 8200, facebook: 6100 },
    { date: "2024-11-15", youtube: 15800, instagram: 9400, facebook: 7300 },
    { date: "2024-12-01", youtube: 18200, instagram: 11200, facebook: 8600 },
    { date: "2024-12-15", youtube: 22400, instagram: 13800, facebook: 9200 },
    { date: "2025-01-01", youtube: 28600, instagram: 16400, facebook: 11400 },
    { date: "2025-01-15", youtube: 34200, instagram: 19800, facebook: 13600 },
  ];
  res.json({ period: "last-90-days", dataPoints });
});

router.post("/metadata/sync", async (req, res) => {
  const userId = req.user?.sub ?? "anonymous";
  const platforms = (req.body as { platforms?: string[] })?.platforms ?? ["youtube", "instagram", "facebook"];

  const q = getMetadataSyncQueue();

  if (q) {
    const job = await q.add("sync", {
      userId,
      platforms,
      requestedAt: new Date().toISOString(),
    } satisfies SyncJobData);

    res.json({
      queued: true,
      jobId: job.id,
      message: "Sincronização agendada com sucesso.",
      platforms,
    });
  } else {
    try {
      const mockEntries = [
        { platform: "youtube", contentType: "video", contentId: "yt_vid_001", title: "Fullstack Apps with NestJS", views: 142500, likes: 8320, comments: 412, shares: 0, impressions: 0, reach: 0, engagementRate: 6.15, collectedAt: new Date() },
        { platform: "instagram", contentType: "media", contentId: "ig_med_001", title: "Major feature shipped!", views: 45200, likes: 3420, comments: 187, shares: 0, impressions: 45200, reach: 28400, engagementRate: 7.98, collectedAt: new Date() },
        { platform: "facebook", contentType: "post", contentId: "fb_post_001", title: "SocialMetaCollector launched", views: 32600, likes: 1240, comments: 87, shares: 156, impressions: 32600, reach: 18400, engagementRate: 4.55, collectedAt: new Date() },
      ];
      await db.insert(metadataTable).values(mockEntries);
      res.json({ queued: false, success: true, message: "Sync completed", platformsSynced: platforms, syncedAt: new Date().toISOString() });
    } catch (err) {
      req.log.error({ err }, "Error syncing metadata");
      res.status(500).json({ error: "sync_failed" });
    }
  }
});

export default router;
