import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import { TikTokProvider } from "../services/TikTokProvider.js";

const router = Router();
const tiktok = new TikTokProvider();

const tiktokVideos = [
  {
    id: "tt_vid_001",
    description: "How to build a fullstack app in 60 seconds #coding #webdev #tutorial",
    viewCount: 892000,
    likeCount: 74200,
    commentCount: 3420,
    shareCount: 12800,
    duration: 59,
    coverUrl: "https://picsum.photos/seed/tt001/320/568",
    createTime: new Date("2025-01-25T10:00:00Z").toISOString(),
    platform: "tiktok",
  },
  {
    id: "tt_vid_002",
    description: "Redis explained in under a minute #redis #backend #tech",
    viewCount: 645000,
    likeCount: 52100,
    commentCount: 2180,
    shareCount: 8900,
    duration: 48,
    coverUrl: "https://picsum.photos/seed/tt002/320/568",
    createTime: new Date("2025-01-20T14:00:00Z").toISOString(),
    platform: "tiktok",
  },
  {
    id: "tt_vid_003",
    description: "Why TypeScript is the future of JavaScript #typescript #javascript #programming",
    viewCount: 1240000,
    likeCount: 98400,
    commentCount: 5600,
    shareCount: 18200,
    duration: 55,
    coverUrl: "https://picsum.photos/seed/tt003/320/568",
    createTime: new Date("2025-01-15T09:00:00Z").toISOString(),
    platform: "tiktok",
  },
  {
    id: "tt_vid_004",
    description: "OAuth 2.0 in 45 seconds — how it really works #oauth #security #dev",
    viewCount: 534000,
    likeCount: 41800,
    commentCount: 1920,
    shareCount: 7400,
    duration: 45,
    coverUrl: "https://picsum.photos/seed/tt004/320/568",
    createTime: new Date("2025-01-10T11:00:00Z").toISOString(),
    platform: "tiktok",
  },
  {
    id: "tt_vid_005",
    description: "Stop using console.log for debugging! Use this instead #devtips #javascript",
    viewCount: 2180000,
    likeCount: 186000,
    commentCount: 8400,
    shareCount: 32000,
    duration: 38,
    coverUrl: "https://picsum.photos/seed/tt005/320/568",
    createTime: new Date("2025-01-05T08:00:00Z").toISOString(),
    platform: "tiktok",
  },
];

router.get("/tiktok/profile", async (req, res) => {
  const token = await db.select().from(tokensTable).where(eq(tokensTable.platform, "tiktok")).limit(1);
  const accountName = token[0]?.accountName ?? "techdevstudio";

  res.json({
    id: "tt_profile_001",
    uniqueId: accountName,
    nickname: "TechDev Studio",
    bioDescription: "60-second dev tutorials | TypeScript, React, Node.js",
    followerCount: 324000,
    followingCount: 128,
    videoCount: tiktokVideos.length,
    heartCount: tiktokVideos.reduce((s, v) => s + v.likeCount, 0),
    avatarUrl: "https://picsum.photos/seed/ttprofile/96/96",
  });
});

router.get("/tiktok/videos", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const sliced = tiktokVideos.slice(offset, offset + limit);
  res.json({ items: sliced, total: tiktokVideos.length, limit, offset });
});

router.get("/tiktok/analytics", async (req, res) => {
  const totalViews = tiktokVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = tiktokVideos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = tiktokVideos.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = tiktokVideos.reduce((s, v) => s + v.shareCount, 0);
  const averageEngagementRate = ((totalLikes + totalComments + totalShares) / totalViews) * 100;

  const mockPayload = {
    platform: "tiktok",
    totalContent: tiktokVideos.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
    followerCount: 324000,
    growthRate: 12.5,
    topContent: tiktokVideos.slice(0, 3).map((v) => ({
      id: v.id,
      title: v.description.slice(0, 60) + "...",
      views: v.viewCount,
      likes: v.likeCount,
      engagementRate: parseFloat((((v.likeCount + v.commentCount + v.shareCount) / v.viewCount) * 100).toFixed(2)),
      platform: "tiktok",
    })),
  };

  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.platform, "tiktok"))
    .limit(1);

  if (token?.connected && token.accessToken) {
    try {
      const normalized = await tiktok.getNormalizedMetrics(token.accessToken, token.scope, 28);
      const hasScope = tiktok.hasVideoListScope(token.scope);
      const hasSignal = normalized.totalViews > 0;
      res.json({
        ...mockPayload,
        totalContent: normalized.postsCount,
        totalViews: normalized.totalViews,
        totalLikes: Math.round((normalized.engagementRate / 100) * normalized.totalViews),
        averageEngagementRate: parseFloat(normalized.engagementRate.toFixed(2)),
        followerCount: normalized.followers,
        normalized,
        analyticsAvailable: hasScope && hasSignal,
        analyticsReason: !hasScope ? "insufficient_scope" : !hasSignal ? "no_signal" : "ok",
        periodDays: normalized.periodDays,
      });
      return;
    } catch (err) {
      req.log.error({ err }, "tiktok analytics failed; falling back to mock");
      res.json({ ...mockPayload, analyticsAvailable: false, analyticsReason: "upstream_error" });
      return;
    }
  }

  res.json({ ...mockPayload, analyticsAvailable: false, analyticsReason: "not_connected" });
});

export default router;
