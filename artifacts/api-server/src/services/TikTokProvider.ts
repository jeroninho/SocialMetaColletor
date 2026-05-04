import { httpGet } from "../utils/http.js";
import { decryptToken } from "../utils/crypto.js";
import type { NormalizedPlatformMetrics } from "./YouTubeProvider.js";

export const TIKTOK_VIDEO_LIST_SCOPE = "video.list";

export interface TikTokUserInfo {
  openId: string;
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
  avatarUrl?: string;
}

export interface TikTokVideo {
  id: string;
  title?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createTime: string;
}

export class TikTokProvider {
  private readonly apiBase = "https://open.tiktokapis.com/v2";

  private decrypt(encryptedToken: string): string {
    return decryptToken(encryptedToken);
  }

  hasVideoListScope(scope?: string | null): boolean {
    if (!scope) return false;
    return scope.split(/[,\s]+/).includes(TIKTOK_VIDEO_LIST_SCOPE);
  }

  async getUserInfo(encryptedToken: string): Promise<TikTokUserInfo> {
    const token = this.decrypt(encryptedToken);
    const response = await httpGet<{ data?: { user?: {
      open_id: string; username: string; display_name: string;
      follower_count?: number; following_count?: number; likes_count?: number;
      video_count?: number; avatar_url?: string;
    } } }>(`${this.apiBase}/user/info/`, {
      params: {
        fields:
          "open_id,username,display_name,avatar_url,follower_count,following_count,likes_count,video_count",
      },
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 8000,
    });
    const u = response.data?.data?.user;
    if (!u) throw new Error("TikTok API returned no user data.");
    return {
      openId: u.open_id,
      username: u.username,
      displayName: u.display_name,
      followerCount: u.follower_count ?? 0,
      followingCount: u.following_count ?? 0,
      likesCount: u.likes_count ?? 0,
      videoCount: u.video_count ?? 0,
      avatarUrl: u.avatar_url,
    };
  }

  async getRecentVideos(encryptedToken: string, maxCount = 20): Promise<TikTokVideo[]> {
    const token = this.decrypt(encryptedToken);
    const url = `${this.apiBase}/video/list/?fields=${encodeURIComponent(
      "id,title,view_count,like_count,comment_count,share_count,create_time",
    )}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let body: { data?: { videos?: Array<{
      id: string; title?: string; view_count?: number; like_count?: number;
      comment_count?: number; share_count?: number; create_time?: number;
    }> } };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ max_count: Math.min(Math.max(maxCount, 1), 20) }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`TikTok video.list failed with HTTP ${res.status}`);
      body = (await res.json()) as typeof body;
    } finally {
      clearTimeout(timer);
    }
    const videos = body.data?.videos ?? [];
    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      viewCount: v.view_count ?? 0,
      likeCount: v.like_count ?? 0,
      commentCount: v.comment_count ?? 0,
      shareCount: v.share_count ?? 0,
      createTime: v.create_time
        ? new Date(v.create_time * 1000).toISOString()
        : new Date().toISOString(),
    }));
  }

  async getNormalizedMetrics(
    encryptedToken: string,
    scope: string | null,
    periodDays = 28,
  ): Promise<NormalizedPlatformMetrics> {
    const user = await this.getUserInfo(encryptedToken);

    let totalViews = 0;
    let engagement = 0;
    let postsCount = user.videoCount;
    if (this.hasVideoListScope(scope)) {
      try {
        const videos = await this.getRecentVideos(encryptedToken, 20);
        const since = Date.now() - periodDays * 86400_000;
        const recent = videos.filter((v) => new Date(v.createTime).getTime() >= since);
        const pool = recent.length > 0 ? recent : videos;
        totalViews = pool.reduce((s, v) => s + v.viewCount, 0);
        engagement = pool.reduce((s, v) => s + v.likeCount + v.commentCount + v.shareCount, 0);
        postsCount = recent.length > 0 ? recent.length : user.videoCount;
      } catch {
        // ignore — fall through to user-level totals
      }
    }

    if (totalViews === 0) {
      // Best-effort fallback: use lifetime likes as a proxy for engagement and
      // leave totalViews at 0 so the dashboard can flag analytics as
      // unavailable for this period.
      engagement = user.likesCount;
    }

    const engagementRate = totalViews > 0 ? (engagement / totalViews) * 100 : 0;

    return {
      platform: "tiktok",
      followers: user.followerCount,
      totalViews,
      engagementRate,
      reach: totalViews,
      impressions: totalViews,
      ctr: 0,
      watchTimeMinutes: 0,
      postsCount,
      periodDays,
      lastUpdated: new Date().toISOString(),
    };
  }
}
