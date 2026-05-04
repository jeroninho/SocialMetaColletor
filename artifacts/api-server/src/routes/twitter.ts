import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, tokensTable } from "@workspace/db";
import { TwitterProvider } from "../services/TwitterProvider.js";

const router = Router();
const twitter = new TwitterProvider();

const tweets = [
  {
    id: "tw_001",
    text: "Just shipped a new feature: real-time analytics dashboard with WebSocket updates. The future of monitoring is here. 🚀\n\n#webdev #typescript #react",
    likeCount: 2840,
    retweetCount: 892,
    replyCount: 156,
    impressionCount: 124000,
    quoteCount: 67,
    bookmarkCount: 445,
    createdAt: new Date("2025-01-25T16:00:00Z").toISOString(),
    platform: "twitter",
  },
  {
    id: "tw_002",
    text: "Hot take: If you're not using TypeScript in 2025, you're leaving bugs on the table.\n\nType safety isn't about being pedantic — it's about shipping with confidence.",
    likeCount: 8420,
    retweetCount: 2140,
    replyCount: 534,
    impressionCount: 342000,
    quoteCount: 189,
    bookmarkCount: 1240,
    createdAt: new Date("2025-01-20T12:00:00Z").toISOString(),
    platform: "twitter",
  },
  {
    id: "tw_003",
    text: "Thread: 10 PostgreSQL performance tips that will save your production database 🧵\n\n1/ Always use EXPLAIN ANALYZE before optimizing queries...",
    likeCount: 5630,
    retweetCount: 1780,
    replyCount: 312,
    impressionCount: 256000,
    quoteCount: 98,
    bookmarkCount: 2890,
    createdAt: new Date("2025-01-15T09:00:00Z").toISOString(),
    platform: "twitter",
  },
  {
    id: "tw_004",
    text: "Building in public update: SocialMetaCollector now supports 5 platforms!\n\n✅ YouTube\n✅ Instagram\n✅ Facebook\n✅ TikTok\n✅ X/Twitter\n\nAll metrics in one dashboard.",
    likeCount: 3920,
    retweetCount: 1120,
    replyCount: 287,
    impressionCount: 198000,
    quoteCount: 45,
    bookmarkCount: 678,
    createdAt: new Date("2025-01-10T14:00:00Z").toISOString(),
    platform: "twitter",
  },
  {
    id: "tw_005",
    text: "The best code is the code you don't write.\n\nBut the second best is well-typed code with tests. 😉",
    likeCount: 12400,
    retweetCount: 3400,
    replyCount: 445,
    impressionCount: 520000,
    quoteCount: 256,
    bookmarkCount: 1890,
    createdAt: new Date("2025-01-05T11:00:00Z").toISOString(),
    platform: "twitter",
  },
];

router.get("/twitter/profile", async (req, res) => {
  const token = await db.select().from(tokensTable).where(eq(tokensTable.platform, "twitter")).limit(1);
  const accountName = token[0]?.accountName ?? "techdevstudio";

  res.json({
    id: "tw_profile_001",
    username: accountName,
    name: "TechDev Studio",
    description: "Building modern web apps. Sharing dev tips, tutorials, and hot takes. Ship fast, break nothing.",
    followersCount: 89400,
    followingCount: 842,
    tweetCount: tweets.length,
    listedCount: 234,
    profileImageUrl: "https://picsum.photos/seed/twprofile/96/96",
    verified: false,
    createdAt: new Date("2020-06-15T00:00:00Z").toISOString(),
  });
});

router.get("/twitter/tweets", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const sliced = tweets.slice(offset, offset + limit);
  res.json({ items: sliced, total: tweets.length, limit, offset });
});

router.get("/twitter/analytics", async (req, res) => {
  const totalImpressions = tweets.reduce((s, t) => s + t.impressionCount, 0);
  const totalLikes = tweets.reduce((s, t) => s + t.likeCount, 0);
  const totalRetweets = tweets.reduce((s, t) => s + t.retweetCount, 0);
  const totalReplies = tweets.reduce((s, t) => s + t.replyCount, 0);
  const totalBookmarks = tweets.reduce((s, t) => s + t.bookmarkCount, 0);
  const averageEngagementRate = ((totalLikes + totalRetweets + totalReplies) / totalImpressions) * 100;

  const mockPayload = {
    platform: "twitter",
    totalContent: tweets.length,
    totalViews: totalImpressions,
    totalLikes,
    totalComments: totalReplies,
    totalShares: totalRetweets,
    totalBookmarks,
    averageEngagementRate: parseFloat(averageEngagementRate.toFixed(2)),
    followerCount: 89400,
    growthRate: 7.3,
    topContent: tweets.slice(0, 3).map((t) => ({
      id: t.id,
      title: t.text.slice(0, 60) + "...",
      views: t.impressionCount,
      likes: t.likeCount,
      engagementRate: parseFloat((((t.likeCount + t.retweetCount + t.replyCount) / t.impressionCount) * 100).toFixed(2)),
      platform: "twitter",
    })),
  };

  const [token] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.platform, "twitter"))
    .limit(1);

  if (token?.connected && token.accessToken) {
    try {
      const normalized = await twitter.getNormalizedMetrics(token.accessToken, token.scope, 28);
      const hasScope = twitter.hasReadScope(token.scope);
      const hasSignal = normalized.totalViews > 0 || normalized.impressions > 0;
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
      req.log.error({ err }, "twitter analytics failed; falling back to mock");
      res.json({ ...mockPayload, analyticsAvailable: false, analyticsReason: "upstream_error" });
      return;
    }
  }

  res.json({ ...mockPayload, analyticsAvailable: false, analyticsReason: "not_connected" });
});

export default router;
