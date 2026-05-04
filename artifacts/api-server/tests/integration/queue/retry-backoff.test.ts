import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installBullmqMock } from "../../mocks/bullmq.js";

const dbState = {
  selectRows: [] as Array<{ platform: string; connected: boolean; accessToken: string; scope: string | null }>,
  insertImpl: null as null | ((rows: unknown[]) => unknown[] | Promise<unknown[]>),
};

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => dbState.selectRows }) }),
      }),
      insert: () => ({
        values: async (rows: unknown[]) => {
          if (dbState.insertImpl) return dbState.insertImpl(rows);
          return rows;
        },
      }),
    },
  };
});

vi.mock("../../../src/services/YouTubeProvider.js", () => ({
  YouTubeProvider: vi.fn(function YT() {
    return {
      getRecentEngagement: vi.fn(async () => ({ videos: [{ videoId: "v1", title: "t", views: 10, likes: 1, comments: 1 }] })),
      getChannelAnalytics: vi.fn(async () => ({ available: false, views: 0, likes: 0, comments: 0, shares: 0, thumbnailImpressions: 0, periodDays: 28 })),
    };
  }),
}));
vi.mock("../../../src/services/MetaProvider.js", () => ({
  MetaProvider: vi.fn(function MP() {
    return {
      getInstagramRecentEngagement: vi.fn(async () => ({ posts: [] })),
      getFacebookRecentEngagement: vi.fn(async () => ({ posts: [] })),
    };
  }),
}));

let bull!: ReturnType<typeof installBullmqMock>;

beforeAll(() => {
  process.env["REDIS_URL"] = "redis://localhost:6379";
  bull = installBullmqMock();
});

afterAll(() => {
  delete process.env["REDIS_URL"];
  bull.restore();
  vi.restoreAllMocks();
});

beforeEach(() => {
  bull.state.added.length = 0;
  bull.state.workers.length = 0;
  dbState.selectRows = [];
  dbState.insertImpl = null;
});

describe("BullMQ Queue config — attempts + exponential backoff", () => {
  it("metadataSyncQueue is constructed with attempts=3 and exponential backoff", async () => {
    vi.resetModules();
    const mod = await import("../../../src/queues/metadataSyncQueue.js");
    expect(mod.getMetadataSyncQueue()).not.toBeNull();

    const QueueCtor = (await import("bullmq")).Queue as unknown as { mock: { calls: unknown[][] } };
    const opts = QueueCtor.mock.calls.at(-1)?.[1] as {
      defaultJobOptions?: { attempts?: number; backoff?: { type: string; delay: number } };
    };
    expect(opts?.defaultJobOptions?.attempts).toBe(3);
    expect(opts?.defaultJobOptions?.backoff?.type).toBe("exponential");
    expect(opts?.defaultJobOptions?.backoff?.delay).toBeGreaterThan(0);
  });
});

describe("Worker retry helper — drain semantics", () => {
  // Verifies the test infrastructure itself: a processor that throws is retried
  // up to `attempts` times, then ends with failedReason set (dead-letter).
  it("retries a throwing processor up to maxAttempts then marks the job failed", async () => {
    let callCount = 0;
    const processor = vi.fn(async () => {
      callCount += 1;
      throw new Error(`boom ${callCount}`);
    });

    const Worker = (await import("bullmq")).Worker as unknown as new (n: string, p: typeof processor) => unknown;
    new Worker("test", processor);

    const Queue = (await import("bullmq")).Queue as unknown as new () => { add: (n: string, d: unknown) => Promise<unknown> };
    const q = new Queue();
    await q.add("t", { x: 1 });

    await bull.drain(3);

    expect(processor).toHaveBeenCalledTimes(3);
    const job = bull.state.added.at(-1) as { attemptsMade: number; failedReason?: string; result?: unknown };
    expect(job.attemptsMade).toBe(3);
    expect(job.result).toBeUndefined();
    expect(job.failedReason).toMatch(/boom 3/);
  });

  it("a processor that succeeds on the second attempt is not re-tried after success", async () => {
    let calls = 0;
    const processor = vi.fn(async () => {
      calls += 1;
      if (calls < 2) throw new Error("transient");
      return { ok: true };
    });

    const Worker = (await import("bullmq")).Worker as unknown as new (n: string, p: typeof processor) => unknown;
    new Worker("test", processor);
    const Queue = (await import("bullmq")).Queue as unknown as new () => { add: (n: string, d: unknown) => Promise<unknown> };
    await new Queue().add("t", {});

    await bull.drain(3);

    expect(processor).toHaveBeenCalledTimes(2);
    const job = bull.state.added.at(-1) as { attemptsMade: number; failedReason?: string; result?: { ok: boolean } };
    expect(job.attemptsMade).toBe(2);
    expect(job.failedReason).toBeUndefined();
    expect(job.result?.ok).toBe(true);
  });
});

describe("metadataSyncQueue processor — per-platform error isolation", () => {
  it("a transient db insert failure surfaces in the errors map without throwing", async () => {
    vi.resetModules();
    const { getMetadataSyncQueue, startSyncWorker } = await import("../../../src/queues/metadataSyncQueue.js");

    dbState.selectRows = [{ platform: "youtube", connected: true, accessToken: "tok", scope: null }];
    dbState.insertImpl = () => {
      throw new Error("permanent db failure");
    };

    startSyncWorker();
    const q = getMetadataSyncQueue()!;
    await q.add("sync", { userId: "u1", platforms: ["youtube"], requestedAt: new Date().toISOString() });

    await bull.drain(3);

    const job = bull.state.added.at(-1) as {
      attemptsMade: number;
      result?: { success: boolean; platformsSynced: string[]; errors: Record<string, string> };
      failedReason?: string;
    };
    // The processor catches per-platform errors → no BullMQ-level retry.
    expect(job.attemptsMade).toBe(1);
    expect(job.failedReason).toBeUndefined();
    expect(job.result?.success).toBe(false);
    expect(job.result?.errors.youtube).toMatch(/permanent db failure/);
    expect(job.result?.platformsSynced).toEqual([]);
  });

  it("a not-connected platform produces a clear errors entry without writing", async () => {
    vi.resetModules();
    const { getMetadataSyncQueue, startSyncWorker } = await import("../../../src/queues/metadataSyncQueue.js");

    dbState.selectRows = [];
    let inserted = false;
    dbState.insertImpl = () => {
      inserted = true;
      return [];
    };

    startSyncWorker();
    const q = getMetadataSyncQueue()!;
    await q.add("sync", { userId: "u1", platforms: ["facebook"], requestedAt: new Date().toISOString() });

    await bull.drain(3);

    const job = bull.state.added.at(-1) as { result?: { errors: Record<string, string> } };
    expect(job.result?.errors.facebook).toMatch(/not connected/i);
    expect(inserted).toBe(false);
  });
});
