import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable, metadataTable } from "@workspace/db";
import { ListYoutubeVideosQueryParams } from "@workspace/api-zod";

const router = Router();

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

router.get("/youtube/channel", async (req, res) => {
  const token = await db.select().from(tokensTable).where(eq(tokensTable.platform, "youtube")).limit(1);
  const accountName = token[0]?.accountName ?? "TechDevChannel";

  res.json({
    id: "UC_yt_demo_channel_001",
    title: accountName,
    description: "A channel dedicated to modern web development, backend systems, and developer tools.",
    subscriberCount: 184200,
    videoCount: youtubeVideos.length,
    viewCount: youtubeVideos.reduce((sum, v) => sum + v.viewCount, 0),
    thumbnailUrl: "https://picsum.photos/seed/ytchannel/96/96",
    publishedAt: new Date("2021-03-15T00:00:00Z").toISOString(),
  });
});

router.get("/youtube/videos", async (req, res) => {
  const parsed = ListYoutubeVideosQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

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
  const totalViews = youtubeVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = youtubeVideos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = youtubeVideos.reduce((s, v) => s + v.commentCount, 0);
  const averageEngagementRate = ((totalLikes + totalComments) / totalViews) * 100;

  res.json({
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
  });
});

export default router;
