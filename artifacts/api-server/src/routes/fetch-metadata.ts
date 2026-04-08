import { Router } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import { desc } from "drizzle-orm";
import { db, fetchHistoryTable } from "@workspace/db";
import {
  FetchMetadataFromUrlBody,
  ListFetchHistoryQueryParams,
} from "@workspace/api-zod";

const router = Router();

type Platform = "youtube" | "tiktok" | "instagram" | "facebook" | "twitter";

interface NormalizedMetadata {
  platform: Platform;
  url: string;
  title: string;
  author: string;
  description?: string;
  thumbnailUrl?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  publishedAt?: string;
  duration?: string;
  tags?: string[];
}

function detectPlatform(url: string): Platform | null {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("facebook.com") || lower.includes("fb.com") || lower.includes("fb.watch")) return "facebook";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  return null;
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseNumber(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/[^0-9.KMBkmb]/g, "");
  if (!cleaned) return undefined;
  const lower = cleaned.toLowerCase();
  if (lower.endsWith("k")) return Math.round(parseFloat(lower) * 1000);
  if (lower.endsWith("m")) return Math.round(parseFloat(lower) * 1_000_000);
  if (lower.endsWith("b")) return Math.round(parseFloat(lower) * 1_000_000_000);
  const n = parseInt(cleaned.replace(/,/g, ""), 10);
  return isNaN(n) ? undefined : n;
}

async function fetchViaOpenGraph(url: string, platform: Platform): Promise<NormalizedMetadata> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 10000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data as string);

  const og = (prop: string) =>
    $(`meta[property="og:${prop}"]`).attr("content") ||
    $(`meta[name="og:${prop}"]`).attr("content");
  const tw = (name: string) =>
    $(`meta[name="twitter:${name}"]`).attr("content");
  const meta = (name: string) =>
    $(`meta[name="${name}"]`).attr("content") ||
    $(`meta[itemprop="${name}"]`).attr("content");

  const title =
    og("title") || tw("title") || $("title").text() || "Untitled";
  const author =
    og("site_name") ||
    tw("site") ||
    meta("author") ||
    $('[itemprop="author"]').text() ||
    platform;
  const description = og("description") || tw("description") || meta("description") || "";
  const thumbnailUrl = og("image") || tw("image") || "";
  const publishedAt = meta("datePublished") || meta("publishedTime") || og("article:published_time") || undefined;

  return {
    platform,
    url,
    title: title.trim(),
    author: author.trim(),
    description: description.trim(),
    thumbnailUrl: thumbnailUrl.trim() || undefined,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
  };
}

async function fetchYoutubeMetadata(url: string): Promise<NormalizedMetadata> {
  const videoId = extractYoutubeVideoId(url);
  const apiKey = process.env["YOUTUBE_API_KEY"];

  if (videoId && apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;
      const response = await axios.get(apiUrl, { timeout: 8000 });
      const item = response.data?.items?.[0];
      if (item) {
        const snippet = item.snippet;
        const stats = item.statistics;
        const details = item.contentDetails;
        return {
          platform: "youtube",
          url,
          title: snippet?.title ?? "Unknown",
          author: snippet?.channelTitle ?? "Unknown",
          description: snippet?.description ?? "",
          thumbnailUrl: snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url,
          views: parseInt(stats?.viewCount ?? "0", 10),
          likes: parseInt(stats?.likeCount ?? "0", 10),
          comments: parseInt(stats?.commentCount ?? "0", 10),
          publishedAt: snippet?.publishedAt,
          duration: details?.duration,
          tags: snippet?.tags?.slice(0, 10) ?? [],
        };
      }
    } catch {
      // fall through to scraping
    }
  }

  // Fallback: oembed
  try {
    const oembed = await axios.get(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { timeout: 8000 }
    );
    const data = oembed.data as { title?: string; author_name?: string; thumbnail_url?: string };
    return {
      platform: "youtube",
      url,
      title: data.title ?? "Unknown",
      author: data.author_name ?? "Unknown",
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return fetchViaOpenGraph(url, "youtube");
  }
}

async function fetchTikTokMetadata(url: string): Promise<NormalizedMetadata> {
  try {
    const oembed = await axios.get(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { timeout: 10000 }
    );
    const data = oembed.data as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };
    return {
      platform: "tiktok",
      url,
      title: data.title ?? "TikTok video",
      author: data.author_name ?? "Unknown",
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return fetchViaOpenGraph(url, "tiktok");
  }
}

async function fetchInstagramMetadata(url: string): Promise<NormalizedMetadata> {
  try {
    const oembed = await axios.get(
      `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env["INSTAGRAM_ACCESS_TOKEN"] ?? ""}`,
      { timeout: 8000 }
    );
    const data = oembed.data as { title?: string; author_name?: string; thumbnail_url?: string };
    return {
      platform: "instagram",
      url,
      title: data.title ?? "Instagram post",
      author: data.author_name ?? "Unknown",
      thumbnailUrl: data.thumbnail_url,
    };
  } catch {
    return fetchViaOpenGraph(url, "instagram");
  }
}

async function fetchFacebookMetadata(url: string): Promise<NormalizedMetadata> {
  return fetchViaOpenGraph(url, "facebook");
}

async function fetchTwitterMetadata(url: string): Promise<NormalizedMetadata> {
  try {
    const oembed = await axios.get(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { timeout: 8000 }
    );
    const data = oembed.data as { html?: string; author_name?: string; url?: string };
    const match = data.html?.match(/<p[^>]*>(.*?)<\/p>/s);
    const title = match ? match[1].replace(/<[^>]+>/g, "").trim() : "Tweet";
    return {
      platform: "twitter",
      url,
      title: title.slice(0, 200),
      author: data.author_name ?? "Unknown",
    };
  } catch {
    return fetchViaOpenGraph(url, "twitter");
  }
}

router.post("/fetch-metadata", async (req, res) => {
  const parsed = FetchMetadataFromUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "A valid URL is required." });
    return;
  }

  const { url } = parsed.data;
  const platform = detectPlatform(url);

  if (!platform) {
    res.status(400).json({
      error: "unsupported_platform",
      message: "URL not recognized. Supported: YouTube, TikTok, Instagram, Facebook, X/Twitter.",
    });
    return;
  }

  try {
    let metadata: NormalizedMetadata;
    switch (platform) {
      case "youtube":
        metadata = await fetchYoutubeMetadata(url);
        break;
      case "tiktok":
        metadata = await fetchTikTokMetadata(url);
        break;
      case "instagram":
        metadata = await fetchInstagramMetadata(url);
        break;
      case "facebook":
        metadata = await fetchFacebookMetadata(url);
        break;
      case "twitter":
        metadata = await fetchTwitterMetadata(url);
        break;
    }

    const [saved] = await db
      .insert(fetchHistoryTable)
      .values({
        platform: metadata.platform,
        url: metadata.url,
        title: metadata.title,
        author: metadata.author,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        views: metadata.views ?? 0,
        likes: metadata.likes ?? 0,
        comments: metadata.comments ?? 0,
        shares: metadata.shares ?? 0,
        duration: metadata.duration,
        tags: metadata.tags ? metadata.tags.join(",") : undefined,
        publishedAt: metadata.publishedAt ? new Date(metadata.publishedAt) : undefined,
      })
      .returning({ id: fetchHistoryTable.id });

    res.json({ ...metadata, historyId: saved?.id });
  } catch (err) {
    req.log.error({ err }, "Error fetching metadata");
    res.status(500).json({ error: "fetch_failed", message: "Failed to fetch metadata. The URL may be private or blocked." });
  }
});

router.get("/fetch-metadata/history", async (req, res) => {
  const parsed = ListFetchHistoryQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const items = await db
    .select()
    .from(fetchHistoryTable)
    .orderBy(desc(fetchHistoryTable.fetchedAt))
    .limit(limit)
    .offset(offset);

  const total = items.length;

  res.json({
    items: items.map((item) => ({
      ...item,
      publishedAt: item.publishedAt?.toISOString(),
      fetchedAt: item.fetchedAt.toISOString(),
      tags: item.tags ? item.tags.split(",") : [],
    })),
    total,
    limit,
    offset,
  });
});

export default router;
