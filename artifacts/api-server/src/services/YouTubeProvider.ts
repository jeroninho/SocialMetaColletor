import axios from "axios";
import { decryptToken } from "../utils/crypto.js";

export interface ChannelStats {
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  fetchedAt: string;
}

export interface VideoEngagement {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  thumbnailUrl?: string;
}

export interface RecentEngagement {
  videos: VideoEngagement[];
  totalEngagement: number;
  averageEngagementRate: number;
}

export interface ChannelAnalytics {
  available: boolean;
  periodDays: number;
  views: number;
  watchTimeMinutes: number;
  averageViewDuration: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  subscribersLost: number;
  thumbnailImpressions: number;
  thumbnailCtr: number;
}

export interface NormalizedPlatformMetrics {
  platform: string;
  followers: number;
  totalViews: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  ctr: number;
  watchTimeMinutes: number;
  postsCount: number;
  periodDays: number;
  lastUpdated: string;
}

export const YOUTUBE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/yt-analytics.readonly";

export class YouTubeProvider {
  private readonly apiKey: string | undefined;
  private readonly apiBase = "https://www.googleapis.com/youtube/v3";
  private readonly analyticsBase = "https://youtubeanalytics.googleapis.com/v2";

  constructor() {
    this.apiKey = process.env["YOUTUBE_API_KEY"];
  }

  private decrypt(encryptedToken: string): string {
    return decryptToken(encryptedToken);
  }

  hasAnalyticsScope(scope?: string | null): boolean {
    if (!scope) return false;
    return scope.split(/\s+/).includes(YOUTUBE_ANALYTICS_SCOPE);
  }

  async getChannelStats(encryptedToken: string): Promise<ChannelStats> {
    if (!encryptedToken) {
      return this.mockChannelStats();
    }
    // Authenticated path — propagate real failures so callers can return
    // explicit errors rather than silently serving mock data.
    const token = this.decrypt(encryptedToken);
    const response = await axios.get(`${this.apiBase}/channels`, {
      params: { part: "snippet,statistics", mine: true },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error("YouTube Data API returned no channel for this account.");
    }
    return {
      channelId: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnailUrl:
        channel.snippet.thumbnails?.default?.url ?? channel.snippet.thumbnails?.medium?.url,
      publishedAt: channel.snippet.publishedAt,
      subscribers: parseInt(channel.statistics.subscriberCount ?? "0", 10),
      totalViews: parseInt(channel.statistics.viewCount ?? "0", 10),
      videoCount: parseInt(channel.statistics.videoCount ?? "0", 10),
      fetchedAt: new Date().toISOString(),
    };
  }

  async getRecentEngagement(encryptedToken: string, maxResults = 5): Promise<RecentEngagement> {
    if (!encryptedToken) {
      return this.mockRecentEngagement();
    }
    // Authenticated path — propagate real failures.
    const token = this.decrypt(encryptedToken);
    const searchRes = await axios.get(`${this.apiBase}/search`, {
      params: { part: "snippet", forMine: true, type: "video", maxResults, order: "date" },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    const ids = searchRes.data.items?.map((i: { id: { videoId: string } }) => i.id.videoId).join(",");
    if (!ids) {
      return { videos: [], totalEngagement: 0, averageEngagementRate: 0 };
    }
    const statsRes = await axios.get(`${this.apiBase}/videos`, {
      params: { part: "snippet,statistics", id: ids },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    const videos: VideoEngagement[] = statsRes.data.items?.map((v: {
      id: string;
      snippet: { title: string; publishedAt: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    }) => ({
      videoId: v.id,
      title: v.snippet.title,
      views: parseInt(v.statistics.viewCount ?? "0", 10),
      likes: parseInt(v.statistics.likeCount ?? "0", 10),
      comments: parseInt(v.statistics.commentCount ?? "0", 10),
      publishedAt: v.snippet.publishedAt,
      thumbnailUrl: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url,
    })) ?? [];
    const totalEngagement = videos.reduce((s, v) => s + v.likes + v.comments, 0);
    const totalViews = videos.reduce((s, v) => s + v.views, 0);
    return {
      videos,
      totalEngagement,
      averageEngagementRate: totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0,
    };
  }

  async getChannelAnalytics(
    encryptedToken: string,
    scope: string | null,
    periodDays = 28,
  ): Promise<ChannelAnalytics> {
    if (!encryptedToken || !this.hasAnalyticsScope(scope)) {
      return this.unavailableAnalytics(periodDays);
    }
    try {
      const token = this.decrypt(encryptedToken);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const metrics = [
        "views",
        "estimatedMinutesWatched",
        "averageViewDuration",
        "likes",
        "dislikes",
        "comments",
        "shares",
        "subscribersGained",
        "subscribersLost",
      ];

      const baseRes = await axios.get(`${this.analyticsBase}/reports`, {
        params: {
          ids: "channel==MINE",
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          metrics: metrics.join(","),
        },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const row: number[] = baseRes.data.rows?.[0] ?? new Array(metrics.length).fill(0);
      const valueOf = (name: string): number => {
        const idx = metrics.indexOf(name);
        return idx >= 0 ? Number(row[idx] ?? 0) : 0;
      };

      let thumbnailImpressions = 0;
      let thumbnailCtr = 0;
      try {
        const ctrRes = await axios.get(`${this.analyticsBase}/reports`, {
          params: {
            ids: "channel==MINE",
            startDate: fmt(startDate),
            endDate: fmt(endDate),
            metrics: "videoThumbnailImpressions,videoThumbnailImpressionsCtr",
          },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        const r2: number[] = ctrRes.data.rows?.[0] ?? [0, 0];
        thumbnailImpressions = Number(r2[0] ?? 0);
        thumbnailCtr = Number(r2[1] ?? 0);
      } catch {
        // optional metrics — ignore errors
      }

      return {
        available: true,
        periodDays,
        views: valueOf("views"),
        watchTimeMinutes: valueOf("estimatedMinutesWatched"),
        averageViewDuration: valueOf("averageViewDuration"),
        likes: valueOf("likes"),
        dislikes: valueOf("dislikes"),
        comments: valueOf("comments"),
        shares: valueOf("shares"),
        subscribersGained: valueOf("subscribersGained"),
        subscribersLost: valueOf("subscribersLost"),
        thumbnailImpressions,
        thumbnailCtr,
      };
    } catch {
      return this.unavailableAnalytics(periodDays);
    }
  }

  async getNormalizedMetrics(
    encryptedToken: string,
    scope: string | null,
    periodDays = 28,
  ): Promise<NormalizedPlatformMetrics> {
    const channel = await this.getChannelStats(encryptedToken);
    const analytics = await this.getChannelAnalytics(encryptedToken, scope, periodDays);

    let engagementRate: number;
    let reach: number;
    let totalViews: number;
    if (analytics.available && analytics.views > 0) {
      engagementRate =
        ((analytics.likes + analytics.comments + analytics.shares) / analytics.views) * 100;
      reach = analytics.views;
      totalViews = analytics.views;
    } else {
      // Analytics unavailable — fall back to recent-engagement aggregates
      const recent = await this.getRecentEngagement(encryptedToken);
      engagementRate = recent.averageEngagementRate;
      reach = channel.totalViews;
      totalViews = channel.totalViews;
    }

    return {
      platform: "youtube",
      followers: channel.subscribers,
      totalViews,
      engagementRate,
      reach,
      impressions: analytics.thumbnailImpressions,
      ctr: analytics.thumbnailCtr,
      watchTimeMinutes: analytics.watchTimeMinutes,
      postsCount: channel.videoCount,
      periodDays: analytics.periodDays,
      lastUpdated: channel.fetchedAt,
    };
  }

  private unavailableAnalytics(periodDays: number): ChannelAnalytics {
    return {
      available: false,
      periodDays,
      views: 0,
      watchTimeMinutes: 0,
      averageViewDuration: 0,
      likes: 0,
      dislikes: 0,
      comments: 0,
      shares: 0,
      subscribersGained: 0,
      subscribersLost: 0,
      thumbnailImpressions: 0,
      thumbnailCtr: 0,
    };
  }

  private mockChannelStats(): ChannelStats {
    return {
      channelId: "mock_channel_yt",
      title: "Canal Mock YouTube",
      subscribers: 184200,
      totalViews: 434400,
      videoCount: 87,
      fetchedAt: new Date().toISOString(),
    };
  }

  private mockRecentEngagement(): RecentEngagement {
    return {
      videos: [
        { videoId: "yt_001", title: "Fullstack com NestJS e React", views: 142500, likes: 8320, comments: 412, publishedAt: "2025-01-25T10:00:00Z" },
        { videoId: "yt_002", title: "PostgreSQL Performance Tips", views: 98700, likes: 5640, comments: 287, publishedAt: "2025-01-22T09:00:00Z" },
        { videoId: "yt_003", title: "Redis Caching Strategies", views: 76300, likes: 4120, comments: 198, publishedAt: "2025-01-19T11:00:00Z" },
      ],
      totalEngagement: 18977,
      averageEngagementRate: 5.82,
    };
  }
}
