import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";

const router = Router();

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

router.get("/tiktok/analytics", async (_req, res) => {
  const totalViews = tiktokVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = tiktokVideos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = tiktokVideos.reduce((s, v) => s + v.commentCount, 0);
  const totalShares = tiktokVideos.reduce((s, v) => s + v.shareCount, 0);
  const averageEngagementRate = ((totalLikes + totalComments + totalShares) / totalViews) * 100;

  res.json({
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
  });
});

export default router;
