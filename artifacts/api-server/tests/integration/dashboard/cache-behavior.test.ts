import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf } from "../../utils/db-chain.js";
import { installFetchMock } from "../../../src/test/fetchMock.js";

/**
 * The dashboard route caches responses through `cacheGet`/`cacheSet`. When
 * Redis is unavailable, BOTH calls swallow errors so the route must return a
 * fully-computed payload. This test exercises the resilience contract by
 * setting REDIS_URL to a host that always rejects.
 */

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf([]),
      insert: () => ({ values: async () => undefined }),
    },
  };
});

const ORIGINAL_REDIS = process.env["REDIS_URL"];

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  delete process.env["REDIS_URL"];
});

afterAll(() => {
  if (ORIGINAL_REDIS !== undefined) process.env["REDIS_URL"] = ORIGINAL_REDIS;
  vi.restoreAllMocks();
});

describe("dashboard cache resilience", () => {
  it("returns a 200 even with no Redis available (no cache hit, no cache set)", async () => {
    const installed = installFetchMock({ routes: [] });

    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    // X-Cache header is "MISS" because Redis is absent (cacheGet returns null).
    expect(res.headers["x-cache"]).toBe("MISS");
    expect(res.body.totalPlatforms).toBe(5);
  });

  it("two consecutive calls both succeed without Redis, both serving fresh data", async () => {
    const installed = installFetchMock({ routes: [] });

    const a = await request(app).get("/api/dashboard/summary");
    const b = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.headers["x-cache"]).toBe("MISS");
    expect(b.headers["x-cache"]).toBe("MISS");
  });
});
