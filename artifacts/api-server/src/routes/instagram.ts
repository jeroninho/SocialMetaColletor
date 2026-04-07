import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import { ListInstagramMediaQueryParams } from "@workspace/api-zod";

const router = Router();

const instagramMedia = [
  {
    id: "ig_med_001",
    caption: "Just shipped a major feature! Building in public is the best way to grow your community. #buildinpublic #devlife",
    mediaType: "IMAGE" as const,
    likeCount: 3420,
    commentsCount: 187,
    reach: 28400,
    impressions: 45200,
    mediaUrl: "https://picsum.photos/seed/ig001/800/800",
    thumbnailUrl: "https://picsum.photos/seed/ig001/400/400",
    timestamp: new Date("2025-01-20T16:30:00Z").toISOString(),
    platform: "instagram",
  },
  {
    id: "ig_med_002",
    caption: "Tutorial video on Redis caching strategies. Watch the full tutorial on YouTube! Link in bio. #redis #webdev #tutorial",
    mediaType: "VIDEO" as const,
    likeCount: 2810,
    commentsCount: 143,
    reach: 22600,
    impressions: 38700,
    mediaUrl: "https://picsum.photos/seed/ig002/800/800",
    thumbnailUrl: "https://picsum.photos/seed/ig002/400/400",
    timestamp: new Date("2025-01-15T12:00:00Z").toISOString(),
    platform: "instagram",
  },
  {
    id: "ig_med_003",
    caption: "Behind the scenes of building SocialMetaCollector. Tracking social metrics across all platforms is now easier than ever! #startup #saas",
    mediaType: "CAROUSEL_ALBUM" as const,
    likeCount: 4250,
    commentsCount: 312,
    reach: 35800,
    impressions: 56400,
    mediaUrl: "https://picsum.photos/seed/ig003/800/800",
    thumbnailUrl: "https://picsum.photos/seed/ig003/400/400",
    timestamp: new Date("2025-01-10T09:00:00Z").toISOString(),
    platform: "instagram",
  },
  {
    id: "ig_med_004",
    caption: "Morning coding session. TypeScript is beautiful when you get it right. #typescript #coding",
    mediaType: "IMAGE" as const,
    likeCount: 1890,
    commentsCount: 98,
    reach: 16200,
    impressions: 24800,
    mediaUrl: "https://picsum.photos/seed/ig004/800/800",
    thumbnailUrl: "https://picsum.photos/seed/ig004/400/400",
    timestamp: new Date("2025-01-05T08:00:00Z").toISOString(),
    platform: "instagram",
  },
  {
    id: "ig_med_005",
    caption: "2024 year in review — built 12 projects, shipped 4 major features, and learned 3 new technologies. What a year!",
    mediaType: "IMAGE" as const,
    likeCount: 5640,
    commentsCount: 428,
    reach: 48200,
    impressions: 72600,
    mediaUrl: "https://picsum.photos/seed/ig005/800/800",
    thumbnailUrl: "https://picsum.photos/seed/ig005/400/400",
    timestamp: new Date("2024-12-31T18:00:00Z").toISOString(),
    platform: "instagram",
  },
];

router.get("/instagram/profile", async (req, res) => {
  const token = await db.select().from(tokensTable).where(eq(tokensTable.platform, "instagram")).limit(1);
  const accountName = token[0]?.accountName ?? "techdevstudio";

  res.json({
    id: "ig_profile_001",
    username: accountName,
    name: "Tech Dev Studio",
    biography: "Building modern web apps. Tutorials on NestJS, React, PostgreSQL, and Redis. New videos every week.",
    followersCount: 42800,
    followingCount: 312,
    mediaCount: instagramMedia.length,
    profilePictureUrl: "https://picsum.photos/seed/igprofile/96/96",
    website: "https://techdevstudio.dev",
  });
});

router.get("/instagram/media", async (req, res) => {
  const parsed = ListInstagramMediaQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const sliced = instagramMedia.slice(offset, offset + limit);
  res.json({ items: sliced, total: instagramMedia.length, limit, offset });
});

router.get("/instagram/analytics", async (_req, res) => {
  const totalViews = instagramMedia.reduce((s, m) => s + m.impressions, 0);
  const totalLikes = instagramMedia.reduce((s, m) => s + m.likeCount, 0);
  const totalComments = instagramMedia.reduce((s, m) => s + m.commentsCount, 0);
  const averageEngagementRate = ((totalLikes + totalComments) / totalViews) * 100;

  res.json({
    platform: "instagram",
    totalContent: instagramMedia.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares: 0,
    averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
    followerCount: 42800,
    growthRate: 5.8,
    topContent: instagramMedia.slice(0, 3).map((m) => ({
      id: m.id,
      title: m.caption.slice(0, 60) + "...",
      views: m.impressions,
      likes: m.likeCount,
      engagementRate: parseFloat((((m.likeCount + m.commentsCount) / m.impressions) * 100).toFixed(2)),
      platform: "instagram",
    })),
  });
});

export default router;
