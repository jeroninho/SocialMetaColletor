import { Router } from "express";
import { desc } from "drizzle-orm";
import { db, metadataTable } from "@workspace/db";
import { ListRecentMetadataQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  res.json({
    totalPlatforms: 3,
    connectedPlatforms: 2,
    totalFollowers: 184200 + 42800 + 31200,
    totalContent: 5 + 5 + 5,
    totalViews: 434400 + 237700 + 209600,
    totalEngagements: 25180 + 18010 + 14230,
    averageEngagementRate: 4.21,
    platformBreakdown: [
      {
        platform: "youtube",
        connected: true,
        followers: 184200,
        content: 5,
        engagementRate: 5.82,
      },
      {
        platform: "instagram",
        connected: true,
        followers: 42800,
        content: 5,
        engagementRate: 7.59,
      },
      {
        platform: "facebook",
        connected: false,
        followers: 31200,
        content: 5,
        engagementRate: 6.81,
      },
    ],
    lastSyncAt: new Date().toISOString(),
  });
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

  const mockEntries = [
    { id: 1, platform: "youtube", contentType: "video", contentId: "yt_vid_001", title: "Building Fullstack Apps with NestJS and React", views: 142500, likes: 8320, comments: 412, shares: 0, collectedAt: new Date("2025-01-25T10:00:00Z").toISOString() },
    { id: 2, platform: "instagram", contentType: "media", contentId: "ig_med_003", title: "Behind the scenes of building SocialMetaCollector", views: 56400, likes: 4250, comments: 312, shares: 0, collectedAt: new Date("2025-01-24T15:00:00Z").toISOString() },
    { id: 3, platform: "facebook", contentType: "post", contentId: "fb_post_004", title: "Building in public update: 6 months in", views: 68400, likes: 3420, comments: 215, shares: 267, collectedAt: new Date("2025-01-23T12:00:00Z").toISOString() },
    { id: 4, platform: "youtube", contentType: "video", contentId: "yt_vid_002", title: "PostgreSQL Performance Tuning Tips", views: 98700, likes: 5640, comments: 287, shares: 0, collectedAt: new Date("2025-01-22T09:00:00Z").toISOString() },
    { id: 5, platform: "instagram", contentType: "media", contentId: "ig_med_005", title: "2024 year in review", views: 72600, likes: 5640, comments: 428, shares: 0, collectedAt: new Date("2025-01-21T18:00:00Z").toISOString() },
    { id: 6, platform: "facebook", contentType: "post", contentId: "fb_post_003", title: "What's your favorite ORM for Node.js?", views: 45200, likes: 2140, comments: 328, shares: 89, collectedAt: new Date("2025-01-20T14:00:00Z").toISOString() },
    { id: 7, platform: "youtube", contentType: "video", contentId: "yt_vid_003", title: "Redis Caching Strategies Explained", views: 76300, likes: 4120, comments: 198, shares: 0, collectedAt: new Date("2025-01-19T11:00:00Z").toISOString() },
    { id: 8, platform: "instagram", contentType: "media", contentId: "ig_med_001", title: "Just shipped a major feature!", views: 45200, likes: 3420, comments: 187, shares: 0, collectedAt: new Date("2025-01-18T16:00:00Z").toISOString() },
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
  try {
    const mockEntries = [
      { platform: "youtube", contentType: "video", contentId: "yt_vid_001", title: "Building Fullstack Apps with NestJS and React", views: 142500, likes: 8320, comments: 412, shares: 0, impressions: 0, reach: 0, engagementRate: 6.15, collectedAt: new Date() },
      { platform: "instagram", contentType: "media", contentId: "ig_med_001", title: "Just shipped a major feature!", views: 45200, likes: 3420, comments: 187, shares: 0, impressions: 45200, reach: 28400, engagementRate: 7.98, collectedAt: new Date() },
      { platform: "facebook", contentType: "post", contentId: "fb_post_001", title: "We just launched SocialMetaCollector", views: 32600, likes: 1240, comments: 87, shares: 156, impressions: 32600, reach: 18400, engagementRate: 4.55, collectedAt: new Date() },
    ];

    await db.insert(metadataTable).values(mockEntries);

    res.json({
      success: true,
      message: "Sync completed successfully",
      platformsSynced: ["youtube", "instagram", "facebook"],
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error syncing metadata");
    res.status(500).json({ error: "Sync failed" });
  }
});

export default router;
