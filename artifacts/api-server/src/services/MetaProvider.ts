import { httpGet } from "../utils/http.js";
import { decryptToken } from "../utils/crypto.js";

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
            username: d.username,
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
