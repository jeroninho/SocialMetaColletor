import axios from "axios";
import { decryptToken } from "../utils/crypto.js";

export interface ChannelStats {
  channelId: string;
  title: string;
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
}

export interface RecentEngagement {
  videos: VideoEngagement[];
  totalEngagement: number;
  averageEngagementRate: number;
}

export class YouTubeProvider {
  private readonly apiKey: string | undefined;
  private readonly apiBase = "https://www.googleapis.com/youtube/v3";

  constructor() {
    this.apiKey = process.env["YOUTUBE_API_KEY"];
  }

  private getAccessToken(encryptedToken: string): string {
    return decryptToken(encryptedToken);
  }

  async getChannelStats(encryptedToken: string): Promise<ChannelStats> {
    if (this.apiKey) {
      try {
        const token = this.getAccessToken(encryptedToken);
        const response = await axios.get(`${this.apiBase}/channels`, {
          params: { part: "snippet,statistics", mine: true },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        const channel = response.data.items?.[0];
        if (channel) {
          return {
            channelId: channel.id,
            title: channel.snippet.title,
            subscribers: parseInt(channel.statistics.subscriberCount ?? "0", 10),
            totalViews: parseInt(channel.statistics.viewCount ?? "0", 10),
            videoCount: parseInt(channel.statistics.videoCount ?? "0", 10),
            fetchedAt: new Date().toISOString(),
          };
        }
      } catch {
        // fall through to mock
      }
    }

    return this.mockChannelStats();
  }

  async getRecentEngagement(encryptedToken: string, maxResults = 5): Promise<RecentEngagement> {
    if (this.apiKey) {
      try {
        const token = this.getAccessToken(encryptedToken);
        const searchRes = await axios.get(`${this.apiBase}/search`, {
          params: { part: "snippet", forMine: true, type: "video", maxResults, order: "date" },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        const ids = searchRes.data.items?.map((i: { id: { videoId: string } }) => i.id.videoId).join(",");
        if (ids) {
          const statsRes = await axios.get(`${this.apiBase}/videos`, {
            params: { part: "snippet,statistics", id: ids },
            timeout: 8000,
          });
          const videos: VideoEngagement[] = statsRes.data.items?.map((v: {
            id: string;
            snippet: { title: string; publishedAt: string };
            statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
          }) => ({
            videoId: v.id,
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount ?? "0", 10),
            likes: parseInt(v.statistics.likeCount ?? "0", 10),
            comments: parseInt(v.statistics.commentCount ?? "0", 10),
            publishedAt: v.snippet.publishedAt,
          })) ?? [];
          const totalEngagement = videos.reduce((s, v) => s + v.likes + v.comments, 0);
          const totalViews = videos.reduce((s, v) => s + v.views, 0);
          return {
            videos,
            totalEngagement,
            averageEngagementRate: totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0,
          };
        }
      } catch {
        // fall through to mock
      }
    }

    return this.mockRecentEngagement();
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
