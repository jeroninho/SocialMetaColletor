import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf, insertChain } from "../../utils/db-chain.js";

interface MetadataRow { platform: string; contentType: string }

const state: { tokens: unknown[]; insertedMetadata: MetadataRow[] } = {
  tokens: [],
  insertedMetadata: [],
};

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(state.tokens as Record<string, unknown>[]),
      insert: () =>
        insertChain<MetadataRow>((rows) => {
          state.insertedMetadata.push(...rows);
          return rows;
        }),
    },
  };
});

const queueAdd = vi.fn(async (_name: string, data: unknown) => ({
  id: "job-fake-1",
  data,
  updateProgress: vi.fn(async () => {}),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(function FakeQueue() {
    return { add: queueAdd, close: vi.fn(async () => {}) };
  }),
  Worker: vi.fn(function FakeWorker() {
    return { on: vi.fn(), close: vi.fn(async () => {}) };
  }),
}));

let app: Express;

beforeAll(async () => {
  process.env["REDIS_URL"] = "redis://test:6379";
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  state.tokens = [];
  state.insertedMetadata = [];
  queueAdd.mockClear();
});

afterAll(() => {
  delete process.env["REDIS_URL"];
  vi.restoreAllMocks();
});

describe("POST /api/metadata/sync — queued path", () => {
  it("enqueues a job when the Redis-backed queue is available", async () => {
    const res = await request(app)
      .post("/api/metadata/sync")
      .send({ platforms: ["youtube", "instagram"] });

    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);
    expect(res.body.jobId).toBe("job-fake-1");
    expect(res.body.platforms).toEqual(["youtube", "instagram"]);
    expect(queueAdd).toHaveBeenCalledTimes(1);
    expect(queueAdd.mock.calls[0]?.[0]).toBe("sync");
    const data = queueAdd.mock.calls[0]?.[1] as { platforms: string[]; userId: string };
    expect(data.platforms).toEqual(["youtube", "instagram"]);
    expect(data.userId).toBe("anonymous");
  });

  it("uses default platforms when body omits them", async () => {
    const res = await request(app).post("/api/metadata/sync").send({});
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);
    expect(res.body.platforms).toEqual(["youtube", "instagram", "facebook"]);
  });
});
