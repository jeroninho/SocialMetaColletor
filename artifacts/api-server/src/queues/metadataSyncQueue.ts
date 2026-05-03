import { Queue, Worker, type Job } from "bullmq";
import { db, metadataTable, tokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { YouTubeProvider } from "../services/YouTubeProvider.js";
import { MetaProvider } from "../services/MetaProvider.js";

export interface SyncJobData {
  userId: string;
  platforms: string[];
  requestedAt: string;
}

export interface SyncJobResult {
  success: boolean;
  platformsSynced: string[];
  errors: Record<string, string>;
}

const QUEUE_NAME = "metadata-sync";
const REDIS_URL = process.env["REDIS_URL"];

let queue: Queue<SyncJobData, SyncJobResult> | null = null;
let workerStarted = false;

export function getMetadataSyncQueue(): Queue<SyncJobData, SyncJobResult> | null {
  if (queue) return queue;
  if (!REDIS_URL) return null;
  try {
    queue = new Queue<SyncJobData, SyncJobResult>(QUEUE_NAME, {
      connection: { url: REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    return queue;
  } catch {
    return null;
  }
}

async function processSyncJob(job: Job<SyncJobData, SyncJobResult>): Promise<SyncJobResult> {
  const { platforms } = job.data;
  const synced: string[] = [];
  const errors: Record<string, string> = {};

  const youtube = new YouTubeProvider();
  const meta = new MetaProvider();

  for (const platform of platforms) {
    try {
      const [token] = await db.select().from(tokensTable).where(eq(tokensTable.platform, platform)).limit(1);

      if (!token?.connected) {
        errors[platform] = "Platform not connected";
        continue;
      }

      let entries: Array<{
        platform: string;
        contentType: string;
        contentId: string;
        title: string | null;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        impressions: number;
        reach: number;
        engagementRate: number;
      }> = [];

      if (platform === "youtube") {
        const [engagement, analytics] = await Promise.all([
          youtube.getRecentEngagement(token.accessToken),
          youtube.getChannelAnalytics(token.accessToken, token.scope, 28),
        ]);
        entries = engagement.videos.map((v) => ({
          platform: "youtube",
          contentType: "video",
          contentId: v.videoId,
          title: v.title,
          views: v.views,
          likes: v.likes,
          comments: v.comments,
          shares: 0,
          impressions: 0,
          reach: 0,
          engagementRate: v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0,
        }));

        if (analytics.available) {
          entries.push({
            platform: "youtube",
            contentType: "channel-analytics",
            contentId: `channel-period-${analytics.periodDays}d`,
            title: `Channel analytics — last ${analytics.periodDays} days`,
            views: analytics.views,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            impressions: analytics.thumbnailImpressions,
            reach: analytics.views,
            engagementRate:
              analytics.views > 0
                ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.views) * 100
                : 0,
          });
        }
      } else if (platform === "instagram") {
        const engagement = await meta.getInstagramRecentEngagement(token.accessToken);
        entries = engagement.posts.map((p) => ({
          platform: "instagram",
          contentType: "media",
          contentId: p.postId,
          title: p.caption || null,
          views: p.reach,
          likes: p.likes,
          comments: p.comments,
          shares: 0,
          impressions: p.reach,
          reach: p.reach,
          engagementRate: p.reach > 0 ? ((p.likes + p.comments) / p.reach) * 100 : 0,
        }));
      } else if (platform === "facebook") {
        const engagement = await meta.getFacebookRecentEngagement(token.accessToken);
        entries = engagement.posts.map((p) => ({
          platform: "facebook",
          contentType: "post",
          contentId: p.postId,
          title: p.caption || null,
          views: p.reach,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
          impressions: p.reach,
          reach: p.reach,
          engagementRate: p.reach > 0 ? ((p.likes + p.comments + p.shares) / p.reach) * 100 : 0,
        }));
      }

      if (entries.length > 0) {
        await db.insert(metadataTable).values(entries);
      }

      synced.push(platform);
      await job.updateProgress(Math.round((synced.length / platforms.length) * 100));
    } catch (err) {
      errors[platform] = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return { success: synced.length > 0, platformsSynced: synced, errors };
}

export function startSyncWorker(): void {
  if (workerStarted) return;
  if (!REDIS_URL) return;
  try {
    const worker = new Worker<SyncJobData, SyncJobResult>(QUEUE_NAME, processSyncJob, {
      connection: { url: REDIS_URL },
      concurrency: 3,
    });

    worker.on("failed", (job, err) => {
      console.error(`[SyncWorker] Job ${job?.id} failed: ${err.message}`);
    });

    workerStarted = true;
    console.info("[SyncWorker] Metadata sync worker started");
  } catch {
    console.warn("[SyncWorker] Redis not available — worker not started (sync will run synchronously)");
  }
}
