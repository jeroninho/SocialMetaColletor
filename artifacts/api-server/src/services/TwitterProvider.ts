import { httpGet } from "../utils/http.js";
import { decryptToken } from "../utils/crypto.js";
import type { NormalizedPlatformMetrics } from "./YouTubeProvider.js";

export const TWITTER_TWEET_READ_SCOPE = "tweet.read";

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount: number;
}

export interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  impressionCount: number;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  bookmarkCount: number;
}

export class TwitterProvider {
  private readonly apiBase = "https://api.twitter.com/2";

  private decrypt(encryptedToken: string): string {
    return decryptToken(encryptedToken);
  }

  hasReadScope(scope?: string | null): boolean {
    if (!scope) return false;
    return scope.split(/[,\s]+/).includes(TWITTER_TWEET_READ_SCOPE);
  }

  async getUserInfo(encryptedToken: string): Promise<TwitterUserInfo> {
    const token = this.decrypt(encryptedToken);
    const response = await httpGet<{ data?: {
      id: string; username: string; name: string;
      public_metrics?: { followers_count?: number; following_count?: number; tweet_count?: number; listed_count?: number };
    } }>(`${this.apiBase}/users/me`, {
      params: { "user.fields": "public_metrics,username,name" },
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 8000,
    });
    const u = response.data?.data;
    if (!u) throw new Error("Twitter API returned no user data.");
    const m = u.public_metrics ?? {};
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      followersCount: m.followers_count ?? 0,
      followingCount: m.following_count ?? 0,
      tweetCount: m.tweet_count ?? 0,
      listedCount: m.listed_count ?? 0,
    };
  }

  async getRecentTweets(
    encryptedToken: string,
    userId: string,
    maxResults = 25,
  ): Promise<TwitterTweet[]> {
    const token = this.decrypt(encryptedToken);
    const response = await httpGet<{ data?: Array<{
      id: string;
      text: string;
      created_at: string;
      public_metrics?: {
        like_count?: number; retweet_count?: number; reply_count?: number;
        quote_count?: number; bookmark_count?: number; impression_count?: number;
      };
      non_public_metrics?: { impression_count?: number };
    }> }>(`${this.apiBase}/users/${userId}/tweets`, {
      params: {
        max_results: Math.min(Math.max(maxResults, 5), 100),
        "tweet.fields": "public_metrics,non_public_metrics,created_at",
        exclude: "retweets,replies",
      },
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 10000,
    });
    const tweets = response.data?.data ?? [];
    return tweets.map((t) => {
      const pm = t.public_metrics ?? {};
      const npm = t.non_public_metrics ?? {};
      return {
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        impressionCount: npm.impression_count ?? pm.impression_count ?? 0,
        likeCount: pm.like_count ?? 0,
        retweetCount: pm.retweet_count ?? 0,
        replyCount: pm.reply_count ?? 0,
        quoteCount: pm.quote_count ?? 0,
        bookmarkCount: pm.bookmark_count ?? 0,
      };
    });
  }

  async getNormalizedMetrics(
    encryptedToken: string,
    scope: string | null,
    periodDays = 28,
  ): Promise<NormalizedPlatformMetrics> {
    const user = await this.getUserInfo(encryptedToken);

    let impressions = 0;
    let engagement = 0;
    let postsInPeriod = 0;
    if (this.hasReadScope(scope)) {
      try {
        const tweets = await this.getRecentTweets(encryptedToken, user.id, 100);
        const since = Date.now() - periodDays * 86400_000;
        const recent = tweets.filter((t) => new Date(t.createdAt).getTime() >= since);
        impressions = recent.reduce((s, t) => s + t.impressionCount, 0);
        engagement = recent.reduce(
          (s, t) => s + t.likeCount + t.retweetCount + t.replyCount + t.quoteCount,
          0,
        );
        postsInPeriod = recent.length;
      } catch {
        // leave zeros — analyticsAvailable will be false
      }
    }

    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return {
      platform: "twitter",
      followers: user.followersCount,
      totalViews: impressions,
      engagementRate,
      reach: impressions,
      impressions,
      ctr: 0,
      watchTimeMinutes: 0,
      postsCount: postsInPeriod || user.tweetCount,
      periodDays,
      lastUpdated: new Date().toISOString(),
    };
  }
}
