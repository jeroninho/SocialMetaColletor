import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf, insertChain } from "../../utils/db-chain.js";

interface MetadataRow { platform: string }

const state = { tokens: [] as unknown[], inserted: [] as MetadataRow[] };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(state.tokens as Record<string, unknown>[]),
      insert: () =>
        insertChain<MetadataRow>((rows) => {
          state.inserted.push(...rows);
          return rows;
        }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  delete process.env["REDIS_URL"];
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  state.tokens = [];
  state.inserted = [];
});

afterAll(() => vi.restoreAllMocks());

describe("POST /api/metadata/sync — synchronous fallback", () => {
  it("falls back to inline mock sync when REDIS_URL is absent", async () => {
    const res = await request(app)
      .post("/api/metadata/sync")
      .send({ platforms: ["youtube", "facebook"] });

    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(false);
    expect(res.body.success).toBe(true);
    expect(res.body.platformsSynced).toEqual(["youtube", "facebook"]);
    expect(state.inserted.length).toBeGreaterThan(0);
  });

  it("returns 500 + sync_failed when the inline DB insert throws", async () => {
    // Re-mock once with a throwing insert via a derived app.
    vi.resetModules();
    vi.doMock("@workspace/db", async () => {
      const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
      return {
        ...actual,
        db: {
          select: () => chainOf([]),
          insert: () => ({
            values: async () => {
              throw new Error("simulated db failure");
            },
          }),
        },
      };
    });
    const { buildTestApp } = await import("../../utils/test-app.js");
    const localApp = await buildTestApp();

    const res = await request(localApp)
      .post("/api/metadata/sync")
      .send({ platforms: ["youtube"] });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("sync_failed");
  });
});
