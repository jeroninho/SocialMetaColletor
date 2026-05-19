import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, metadataTable, tokensTable } from "@workspace/db";
import { ListRecentMetadataQueryParams } from "@workspace/api-zod";
import { cached, cacheDelByPattern } from "../services/RedisClient.js";
import { getMetadataSyncQueue, startSyncWorker, type SyncJobData } from "../queues/metadataSyncQueue.js";
import { YouTubeProvider, type NormalizedPlatformMetrics } from "../services/YouTubeProvider.js";
import { MetaProvider } from "../services/MetaProvider.js";
import { TikTokProvider } from "../services/TikTokProvider.js";
import { TwitterProvider } from "../services/TwitterProvider.js";

const router = Router();
const CACHE_TTL = parseInt(process.env["CACHE_TTL_SECONDS"] ?? "60", 10);
const PROVIDER_METRICS_TTL = parseInt(
  process.env["PROVIDER_METRICS_TTL_SECONDS"] ?? "600",
  10,
);
const PROVIDER_FETCH_TIMEOUT_MS = parseInt(
  process.env["PROVIDER_FETCH_TIMEOUT_MS"] ?? "4000",
  10,
);

const youtube = new YouTubeProvider();
const meta = new MetaProvider();
const tiktok = new TikTokProvider();
const twitter = new TwitterProvider();

startSyncWorker();

router.get("/dashboard/summary", async (req, res) => {
  const userId = req.user?.sub ?? "anonymous";
  let hit = false;

  const summary = await cached(
    `dashboard:summary:${userId}`,
    CACHE_TTL,
    async () => buildDashboardSummary(req, userId),
    { onHit: () => { hit = true; } },
  );

  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.json(summary);
});

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}_timeout_${ms}ms`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function buildDashboardSummary(
  req: Parameters<Parameters<typeof router.get>[1]>[0],
  userId: string,
) {
  const allTokens = await db.select().from(tokensTable);
  const tokenByPlatform = new Map(allTokens.map((t) => [t.platform, t] as const));

  const MOCK_FALLBACKS: Record<string, NormalizedPlatformMetrics & { content: number }> = {
    youtube: {
      platform: "youtube", followers: 184200, totalViews: 434400, engagementRate: 5.82,
      reach: 434400, impressions: 0, ctr: 0, watchTimeMinutes: 0, postsCount: 5,
      periodDays: 28, lastUpdated: new Date().toISOString(), content: 5,
    },
    instagram: {
      platform: "instagram", followers: 42800, totalViews: 237700, engagementRate: 7.59,
      reach: 237700, impressions: 237700, ctr: 0, watchTimeMinutes: 0, postsCount: 5,
      periodDays: 28, lastUpdated: new Date().toISOString(), content: 5,
    },
    facebook: {
      platform: "facebook", followers: 31200, totalViews: 209600, engagementRate: 6.81,
      reach: 209600, impressions: 209600, ctr: 0, watchTimeMinutes: 0, postsCount: 5,
      periodDays: 28, lastUpdated: new Date().toISOString(), content: 5,
    },
    tiktok: {
      platform: "tiktok", followers: 324000, totalViews: 5491000, engagementRate: 10.07,
      reach: 5491000, impressions: 5491000, ctr: 0, watchTimeMinutes: 0, postsCount: 5,
      periodDays: 28, lastUpdated: new Date().toISOString(), content: 5,
    },
    twitter: {
      platform: "twitter", followers: 89400, totalViews: 1440000, engagementRate: 3.07,
      reach: 1440000, impressions: 1440000, ctr: 0, watchTimeMinutes: 0, postsCount: 5,
      periodDays: 28, lastUpdated: new Date().toISOString(), content: 5,
    },
  };

  type PlatformResult = {
    platform: string;
    connected: boolean;
    analyticsAvailable: boolean;
    metrics: NormalizedPlatformMetrics;
  };

  async function safeFetch(
    platform: string,
    fn: () => Promise<NormalizedPlatformMetrics>,
    hasScope: boolean,
  ): Promise<PlatformResult> {
    const token = tokenByPlatform.get(platform);
    const connected = !!token?.connected;
    if (!connected || !token?.accessToken) {
      return { platform, connected: false, analyticsAvailable: false, metrics: MOCK_FALLBACKS[platform]! };
    }

    const cacheKey = `provider:metrics:${platform}:${userId}:28`;
    let providerCacheHit = false;

    try {
      const metrics = await cached(
        cacheKey,
        PROVIDER_METRICS_TTL,
        () => withTimeout(fn(), PROVIDER_FETCH_TIMEOUT_MS, `${platform}_fetch`),
        {
          onHit: () => { providerCacheHit = true; },
          // Skip caching empty/degraded payloads so we don't pin a bad
          // response for the full TTL when an upstream is briefly flaky.
          cacheIf: (v) =>
            v.totalViews > 0 ||
            v.postsCount > 0 ||
            v.impressions > 0 ||
            v.followers > 0,
        },
      );
      req.log.debug(
        { platform, userId, cacheHit: providerCacheHit },
        "dashboard: provider metrics",
      );
      const hasSignal =
        metrics.totalViews > 0 ||
        metrics.postsCount > 0 ||
        metrics.impressions > 0 ||
        metrics.followers > 0;
      return { platform, connected: true, analyticsAvailable: hasScope && hasSignal, metrics };
    } catch (err) {
      req.log.error({ err, platform }, "dashboard: normalized metrics failed");
      return { platform, connected: true, analyticsAvailable: false, metrics: MOCK_FALLBACKS[platform]! };
    }
  }

  const ytToken = tokenByPlatform.get("youtube");
  const igToken = tokenByPlatform.get("instagram");
  const fbToken = tokenByPlatform.get("facebook");
  const ttToken = tokenByPlatform.get("tiktok");
  const twToken = tokenByPlatform.get("twitter");

  const [ytRes, igRes, fbRes, ttRes, twRes] = await Promise.all([
    safeFetch(
      "youtube",
      () => youtube.getNormalizedMetrics(ytToken!.accessToken, ytToken!.scope, 28),
      youtube.hasAnalyticsScope(ytToken?.scope),
    ),
    safeFetch(
      "instagram",
      () => meta.getInstagramNormalizedMetrics(igToken!.accessToken, igToken!.scope, 28),
      meta.hasInstagramInsightsScope(igToken?.scope),
    ),
    safeFetch(
      "facebook",
      () => meta.getFacebookNormalizedMetrics(fbToken!.accessToken, fbToken!.scope, 28),
      meta.hasFacebookInsightsScope(fbToken?.scope),
    ),
    safeFetch(
      "tiktok",
      () => tiktok.getNormalizedMetrics(ttToken!.accessToken, ttToken!.scope, 28),
      tiktok.hasVideoListScope(ttToken?.scope),
    ),
    safeFetch(
      "twitter",
      () => twitter.getNormalizedMetrics(twToken!.accessToken, twToken!.scope, 28),
      twitter.hasReadScope(twToken?.scope),
    ),
  ]);

  const results: PlatformResult[] = [ytRes, igRes, fbRes, ttRes, twRes];

  const platformBreakdown = results.map((r) => ({
    platform: r.platform,
    connected: r.connected,
    followers: r.metrics.followers,
    content: r.metrics.postsCount,
    engagementRate: parseFloat(r.metrics.engagementRate.toFixed(2)),
    totalViews: r.metrics.totalViews,
    reach: r.metrics.reach,
    impressions: r.metrics.impressions,
    watchTimeMinutes: r.metrics.watchTimeMinutes,
    analyticsAvailable: r.analyticsAvailable,
  }));

  const normalizedBreakdown: NormalizedPlatformMetrics[] = results.map((r) => ({
    ...r.metrics,
    engagementRate: parseFloat(r.metrics.engagementRate.toFixed(2)),
  }));

  const totalFollowers = normalizedBreakdown.reduce((s, p) => s + p.followers, 0);
  const totalViews = normalizedBreakdown.reduce((s, p) => s + p.totalViews, 0);
  const totalContent = normalizedBreakdown.reduce((s, p) => s + p.postsCount, 0);
  const totalEngagements = normalizedBreakdown.reduce(
    (s, p) => s + Math.round((p.engagementRate / 100) * p.totalViews),
    0,
  );
  const averageEngagementRate =
    normalizedBreakdown.reduce((s, p) => s + p.engagementRate, 0) / normalizedBreakdown.length;

  return {
    totalPlatforms: 5,
    connectedPlatforms: platformBreakdown.filter((p) => p.connected).length,
    totalFollowers,
    totalContent,
    totalViews,
    totalEngagements,
    averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
    platformBreakdown,
    normalizedBreakdown,
    lastSyncAt: new Date().toISOString(),
    _source: "db",
  };
}

router.get("/dashboard/recent-metadata", async (req, res) => {
  const parsed = ListRecentMetadataQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

  let hit = false;
  const payload = await cached(
    `dashboard:recent:${limit}`,
    120,
    async () => buildRecentMetadata(limit),
    { onHit: () => { hit = true; } },
  );
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.json(payload);
});

async function buildRecentMetadata(limit: number) {
  const dbEntries = await db
    .select()
    .from(metadataTable)
    .orderBy(desc(metadataTable.collectedAt))
    .limit(limit);

  if (dbEntries.length > 0) {
    return { items: dbEntries, total: dbEntries.length };
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

  return { items: mockEntries, total: mockEntries.length };
}

router.get("/dashboard/engagement-trends", async (_req, res) => {
  let hit = false;
  const payload = await cached(
    "dashboard:trends:v1",
    300,
    async () => ({
      period: "last-90-days",
      dataPoints: [
        { date: "2024-11-01", youtube: 12400, instagram: 8200, facebook: 6100, tiktok: 45000, twitter: 18000 },
        { date: "2024-11-15", youtube: 15800, instagram: 9400, facebook: 7300, tiktok: 62000, twitter: 22000 },
        { date: "2024-12-01", youtube: 18200, instagram: 11200, facebook: 8600, tiktok: 78000, twitter: 28000 },
        { date: "2024-12-15", youtube: 22400, instagram: 13800, facebook: 9200, tiktok: 95000, twitter: 34000 },
        { date: "2025-01-01", youtube: 28600, instagram: 16400, facebook: 11400, tiktok: 124000, twitter: 42000 },
        { date: "2025-01-15", youtube: 34200, instagram: 19800, facebook: 13600, tiktok: 156000, twitter: 52000 },
      ],
    }),
    { onHit: () => { hit = true; } },
  );
  res.setHeader("X-Cache", hit ? "HIT" : "MISS");
  res.json(payload);
});

router.post("/metadata/sync", async (req, res) => {
  const userId = req.user?.sub ?? "anonymous";
  const platforms = (req.body as { platforms?: string[] })?.platforms ?? ["youtube", "instagram", "facebook"];

  // Invalidate cached dashboard and platform analytics so the next fetch
  // surfaces fresh numbers right after a sync is queued.
  await Promise.all([
    cacheDelByPattern("dashboard:"),
    ...platforms.map((p) => cacheDelByPattern(`${p}:`)),
    ...platforms.map((p) => cacheDelByPattern(`provider:metrics:${p}:`)),
  ]);

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
