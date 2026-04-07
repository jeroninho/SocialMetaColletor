import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import { ListFacebookPostsQueryParams } from "@workspace/api-zod";

const router = Router();

const facebookPosts = [
  {
    id: "fb_post_001",
    message: "We just launched SocialMetaCollector — a tool to collect and analyze metadata from YouTube, Instagram, and Facebook all in one place. Check it out!",
    story: undefined,
    likeCount: 1240,
    commentCount: 87,
    shareCount: 156,
    reach: 18400,
    impressions: 32600,
    postType: "status",
    createdTime: new Date("2025-01-22T14:00:00Z").toISOString(),
    platform: "facebook",
  },
  {
    id: "fb_post_002",
    message: "New tutorial: Redis Caching Strategies Explained. Whether you're building a high-traffic API or a simple web app, caching can dramatically improve performance.",
    story: undefined,
    likeCount: 890,
    commentCount: 64,
    shareCount: 112,
    reach: 13200,
    impressions: 24800,
    postType: "link",
    createdTime: new Date("2025-01-18T11:00:00Z").toISOString(),
    platform: "facebook",
  },
  {
    id: "fb_post_003",
    message: "What's your favorite ORM for Node.js? We've been using Drizzle and absolutely love the type safety it provides with PostgreSQL.",
    story: undefined,
    likeCount: 2140,
    commentCount: 328,
    shareCount: 89,
    reach: 28900,
    impressions: 45200,
    postType: "status",
    createdTime: new Date("2025-01-12T09:00:00Z").toISOString(),
    platform: "facebook",
  },
  {
    id: "fb_post_004",
    message: "Building in public update: 6 months in, 12,000 users, and still going strong. Here's what we've learned.",
    story: undefined,
    likeCount: 3420,
    commentCount: 215,
    shareCount: 267,
    reach: 42100,
    impressions: 68400,
    postType: "photo",
    createdTime: new Date("2025-01-05T16:00:00Z").toISOString(),
    platform: "facebook",
  },
  {
    id: "fb_post_005",
    message: "Happy New Year from the TechDev Studio team! 2025 is going to be an incredible year for developers. What are you building?",
    story: undefined,
    likeCount: 1870,
    commentCount: 142,
    shareCount: 198,
    reach: 24800,
    impressions: 38600,
    postType: "status",
    createdTime: new Date("2025-01-01T00:00:00Z").toISOString(),
    platform: "facebook",
  },
];

router.get("/facebook/page", async (req, res) => {
  const token = await db.select().from(tokensTable).where(eq(tokensTable.platform, "facebook")).limit(1);
  const accountName = token[0]?.accountName ?? "TechDevStudio";

  res.json({
    id: "fb_page_001",
    name: accountName,
    about: "Building modern web applications and sharing developer tutorials. Follow for NestJS, React, and PostgreSQL content.",
    category: "Technology",
    fanCount: 28400,
    followersCount: 31200,
    talkingAboutCount: 1840,
    websiteUrl: "https://techdevstudio.dev",
    profilePictureUrl: "https://picsum.photos/seed/fbpage/96/96",
  });
});

router.get("/facebook/posts", async (req, res) => {
  const parsed = ListFacebookPostsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const sliced = facebookPosts.slice(offset, offset + limit);
  res.json({ items: sliced, total: facebookPosts.length, limit, offset });
});

router.get("/facebook/analytics", async (_req, res) => {
  const totalViews = facebookPosts.reduce((s, p) => s + p.impressions, 0);
  const totalLikes = facebookPosts.reduce((s, p) => s + p.likeCount, 0);
  const totalComments = facebookPosts.reduce((s, p) => s + p.commentCount, 0);
  const totalShares = facebookPosts.reduce((s, p) => s + p.shareCount, 0);
  const averageEngagementRate = ((totalLikes + totalComments + totalShares) / totalViews) * 100;

  res.json({
    platform: "facebook",
    totalContent: facebookPosts.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
    followerCount: 31200,
    growthRate: 2.4,
    topContent: facebookPosts.slice(0, 3).map((p) => ({
      id: p.id,
      title: (p.message ?? "").slice(0, 60) + "...",
      views: p.impressions,
      likes: p.likeCount,
      engagementRate: parseFloat((((p.likeCount + p.commentCount + p.shareCount) / p.impressions) * 100).toFixed(2)),
      platform: "facebook",
    })),
  });
});

export default router;
