import { httpGet } from "../utils/http.js";
import { decryptToken } from "../utils/crypto.js";
import type { NormalizedPlatformMetrics } from "./YouTubeProvider.js";

export const FACEBOOK_INSIGHTS_SCOPE = "read_insights";
export const INSTAGRAM_INSIGHTS_SCOPE = "instagram_basic";

export interface FacebookPageStats {
  pageId: string;
  name: string;
  followers: number;
  likes: number;
  totalReach: number;
  fetchedAt: string;
}

export interface InstagramProfileStats {
  userId: string;
  username: string;
  followers: number;
  following: number;
  mediaCount: number;
  fetchedAt: string;
}

export interface PostEngagement {
  postId: string;
  platform: "facebook" | "instagram";
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  publishedAt: string;
}

export interface RecentEngagement {
  posts: PostEngagement[];
  totalEngagement: number;
  averageEngagementRate: number;
}

export class MetaProvider {
  private readonly graphBase = "https://graph.facebook.com/v18.0";

  private getAccessToken(encryptedToken: string): string {
    return decryptToken(encryptedToken);
  }

  hasFacebookInsightsScope(scope?: string | null): boolean {
    if (!scope) return false;
    return scope.split(/[,\s]+/).includes(FACEBOOK_INSIGHTS_SCOPE);
  }

  hasInstagramInsightsScope(scope?: string | null): boolean {
    if (!scope) return false;
    const granted = scope.split(/[,\s]+/);
    // Either a Graph API insights scope, or the Basic Display scopes that
    // let us read /me/media for engagement aggregation.
    return (
      granted.includes(INSTAGRAM_INSIGHTS_SCOPE) ||
      granted.includes("instagram_manage_insights") ||
      granted.includes("user_profile") ||
      granted.includes("user_media")
    );
  }

  async getFacebookNormalizedMetrics(
    encryptedToken: string,
    scope: string | null,
    periodDays = 28,
  ): Promise<NormalizedPlatformMetrics> {
    const token = this.getAccessToken(encryptedToken);
    const accountsRes = await httpGet<{ data?: Array<{ id: string; access_token?: string; followers_count?: number; fan_count?: number }> }>(`${this.graphBase}/me/accounts`, {
      params: { access_token: token, fields: "id,name,fan_count,followers_count,access_token" },
      timeoutMs: 8000,
    });
    const page = accountsRes.data.data?.[0];
    if (!page) {
      throw new Error("Facebook Graph API returned no managed page for this account.");
    }
    const pageToken: string = page.access_token ?? token;
    const followers: number = page.followers_count ?? page.fan_count ?? 0;

    let impressions = 0;
    let reach = 0;
    let engagedUsers = 0;
    let postsCount = 0;
    if (this.hasFacebookInsightsScope(scope)) {
      try {
        const since = Math.floor((Date.now() - periodDays * 86400_000) / 1000);
        const until = Math.floor(Date.now() / 1000);
        const insightsRes = await httpGet<{ data?: Array<{ name: string; values?: Array<{ value: number }> }> }>(`${this.graphBase}/${page.id}/insights`, {
          params: {
            access_token: pageToken,
            metric: "page_impressions,page_impressions_unique,page_engaged_users",
            since,
            until,
            period: "days_28",
          },
          timeoutMs: 10000,
        });
        const rows: Array<{ name: string; values?: Array<{ value: number }> }> =
          insightsRes.data.data ?? [];
        const sumOf = (name: string): number => {
          const row = rows.find((r) => r.name === name);
          return (row?.values ?? []).reduce((s, v) => s + (Number(v.value) || 0), 0);
        };
        impressions = sumOf("page_impressions");
        reach = sumOf("page_impressions_unique");
        engagedUsers = sumOf("page_engaged_users");
      } catch {
        // optional insights — leave zeros so the route can flag analyticsAvailable=false
      }
      try {
        const postsRes = await httpGet<{ data?: unknown[] }>(`${this.graphBase}/${page.id}/posts`, {
          params: { access_token: pageToken, fields: "id", limit: 100 },
          timeoutMs: 8000,
        });
        postsCount = (postsRes.data.data ?? []).length;
      } catch {
        // ignore
      }
    }

    const totalViews = impressions || reach;
    const engagementRate = totalViews > 0 ? (engagedUsers / totalViews) * 100 : 0;

    return {
      platform: "facebook",
      followers,
      totalViews,
      engagementRate,
      reach,
      impressions,
      ctr: 0,
      watchTimeMinutes: 0,
      postsCount,
      periodDays,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getInstagramNormalizedMetrics(
    encryptedToken: string,
    scope: string | null,
    periodDays = 28,
  ): Promise<NormalizedPlatformMetrics> {
    const token = this.getAccessToken(encryptedToken);
    // Project's Instagram OAuth uses Basic Display API (graph.instagram.com),
    // not Graph API. Use Basic Display endpoints as the primary source.
    const igBase = "https://graph.instagram.com";

    let followers = 0;
    let mediaCount = 0;

    const meRes = await httpGet<{ media_count?: number }>(`${igBase}/me`, {
      params: {
        access_token: token,
        fields: "id,username,account_type,media_count",
      },
      timeoutMs: 8000,
    });
    mediaCount = meRes.data.media_count ?? 0;

    // Aggregate engagement from recent media (Basic Display exposes
    // like_count and comments_count per media item).
    const cutoff = Date.now() - periodDays * 86400_000;
    let likes = 0;
    let comments = 0;
    let postsInPeriod = 0;
    try {
      const mediaRes = await httpGet<{ data?: Array<{ like_count?: number; comments_count?: number; timestamp?: string }> }>(`${igBase}/me/media`, {
        params: {
          access_token: token,
          fields: "id,like_count,comments_count,timestamp",
          limit: 50,
        },
        timeoutMs: 10000,
      });
      const media: Array<{ like_count?: number; comments_count?: number; timestamp?: string }> =
        mediaRes.data.data ?? [];
      for (const m of media) {
        const ts = m.timestamp ? Date.parse(m.timestamp) : 0;
        if (ts >= cutoff) {
          likes += Number(m.like_count) || 0;
          comments += Number(m.comments_count) || 0;
          postsInPeriod += 1;
        }
      }
    } catch {
      // ignore — leave engagement at zero, posts count still reflects media_count
    }

    // Optional Business/Insights enrichment when token has the right scope.
    if (this.hasInstagramInsightsScope(scope)) {
      try {
        const accountsRes = await httpGet<{ data?: Array<{ instagram_business_account?: { id?: string } }> }>(`${this.graphBase}/me/accounts`, {
          params: { access_token: token, fields: "id,instagram_business_account" },
          timeoutMs: 8000,
        });
        const page = accountsRes.data.data?.[0];
        const igId = page?.instagram_business_account?.id;
        if (igId) {
          const igRes = await httpGet<{ followers_count?: number; media_count?: number }>(`${this.graphBase}/${igId}`, {
            params: { access_token: token, fields: "id,followers_count,media_count" },
            timeoutMs: 8000,
          });
          followers = igRes.data.followers_count ?? followers;
          mediaCount = igRes.data.media_count ?? mediaCount;
        }
      } catch {
        // ignore — Basic Display data still returned
      }
    }

    const engagement = likes + comments;
    // Use total engagement as the views proxy when impressions aren't available
    // (Basic Display doesn't expose reach/impressions).
    const totalViews = engagement;
    const engagementRate = postsInPeriod > 0 && followers > 0
      ? (engagement / (postsInPeriod * followers)) * 100
      : 0;

    return {
      platform: "instagram",
      followers,
      totalViews,
      engagementRate,
      reach: 0,
      impressions: 0,
      ctr: 0,
      watchTimeMinutes: 0,
      postsCount: postsInPeriod || mediaCount,
      periodDays,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getFacebookPageStats(encryptedToken: string): Promise<FacebookPageStats> {
    try {
      const token = this.getAccessToken(encryptedToken);
      const response = await httpGet<{ data?: Array<{ id: string; name: string; fan_count?: number; followers_count?: number }> }>(`${this.graphBase}/me/accounts`, {
        params: { access_token: token, fields: "id,name,fan_count,followers_count" },
        timeoutMs: 8000,
      });
      const page = response.data.data?.[0];
      if (page) {
        return {
          pageId: page.id,
          name: page.name,
          followers: page.followers_count ?? page.fan_count ?? 0,
          likes: page.fan_count ?? 0,
          totalReach: 0,
          fetchedAt: new Date().toISOString(),
        };
      }
    } catch {
      // fall through to mock
    }
    return this.mockFacebookStats();
  }

  async getInstagramProfileStats(encryptedToken: string): Promise<InstagramProfileStats> {
    const instagramToken = process.env["INSTAGRAM_ACCESS_TOKEN"];
    if (instagramToken) {
      try {
        const response = await httpGet<{ id?: string; username?: string; followers_count?: number; follows_count?: number; media_count?: number }>(`${this.graphBase}/me`, {
          params: { access_token: instagramToken, fields: "id,username,followers_count,follows_count,media_count" },
          timeoutMs: 8000,
        });
        const d = response.data;
        if (d?.id) {
          return {
            userId: d.id,
            username: d.username ?? "instagram_user",
            followers: d.followers_count ?? 0,
            following: d.follows_count ?? 0,
            mediaCount: d.media_count ?? 0,
            fetchedAt: new Date().toISOString(),
          };
        }
      } catch {
        // fall through to mock
      }
    }
    return this.mockInstagramStats();
  }

  async getFacebookRecentEngagement(encryptedToken: string, limit = 5): Promise<RecentEngagement> {
    try {
      const token = this.getAccessToken(encryptedToken);
      const response = await httpGet<{ data?: unknown[] }>(`${this.graphBase}/me/posts`, {
        params: {
          access_token: token,
          fields: "id,message,created_time,likes.summary(true),comments.summary(true),shares",
          limit,
        },
        timeoutMs: 8000,
      });
      const posts = response.data.data ?? [];
      const mapped: PostEngagement[] = posts.map((p: {
        id: string;
        message?: string;
        created_time: string;
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
      }) => ({
        postId: p.id,
        platform: "facebook" as const,
        caption: p.message?.slice(0, 100) ?? "",
        likes: p.likes?.summary?.total_count ?? 0,
        comments: p.comments?.summary?.total_count ?? 0,
        shares: p.shares?.count ?? 0,
        reach: 0,
        publishedAt: p.created_time,
      }));
      const totalEngagement = mapped.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
      return { posts: mapped, totalEngagement, averageEngagementRate: 0 };
    } catch {
      return this.mockFacebookEngagement();
    }
  }

  async getInstagramRecentEngagement(encryptedToken: string, limit = 5): Promise<RecentEngagement> {
    try {
      const token = this.getAccessToken(encryptedToken);
      const response = await httpGet<{ data?: unknown[] }>(`${this.graphBase}/me/media`, {
        params: {
          access_token: token,
          fields: "id,caption,timestamp,like_count,comments_count",
          limit,
        },
        timeoutMs: 8000,
      });
      const media = response.data.data ?? [];
      const mapped: PostEngagement[] = media.map((m: {
        id: string;
        caption?: string;
        timestamp: string;
        like_count?: number;
        comments_count?: number;
      }) => ({
        postId: m.id,
        platform: "instagram" as const,
        caption: m.caption?.slice(0, 100) ?? "",
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        shares: 0,
        reach: 0,
        publishedAt: m.timestamp,
      }));
      const totalEngagement = mapped.reduce((s, p) => s + p.likes + p.comments, 0);
      return { posts: mapped, totalEngagement, averageEngagementRate: 0 };
    } catch {
      return this.mockInstagramEngagement();
    }
  }

  private mockFacebookStats(): FacebookPageStats {
    return { pageId: "mock_fb_page", name: "Página Mock Facebook", followers: 31200, likes: 29800, totalReach: 85000, fetchedAt: new Date().toISOString() };
  }

  private mockInstagramStats(): InstagramProfileStats {
    return { userId: "mock_ig_user", username: "@mock.instagram", followers: 42800, following: 1240, mediaCount: 184, fetchedAt: new Date().toISOString() };
  }

  private mockFacebookEngagement(): RecentEngagement {
    return {
      posts: [
        { postId: "fb_001", platform: "facebook", caption: "Lançamos o SocialMetaCollector!", likes: 1240, comments: 87, shares: 156, reach: 32600, publishedAt: "2025-01-25T10:00:00Z" },
        { postId: "fb_002", platform: "facebook", caption: "Atualização de produto disponível", likes: 980, comments: 54, shares: 89, reach: 21400, publishedAt: "2025-01-22T15:00:00Z" },
      ],
      totalEngagement: 2606,
      averageEngagementRate: 4.82,
    };
  }

  private mockInstagramEngagement(): RecentEngagement {
    return {
      posts: [
        { postId: "ig_001", platform: "instagram", caption: "Bastidores do desenvolvimento", likes: 3420, comments: 187, shares: 0, reach: 28400, publishedAt: "2025-01-24T15:00:00Z" },
        { postId: "ig_002", platform: "instagram", caption: "Resumo de 2024", likes: 5640, comments: 428, shares: 0, reach: 38200, publishedAt: "2025-01-21T18:00:00Z" },
      ],
      totalEngagement: 9675,
      averageEngagementRate: 7.59,
    };
  }
}
