import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: when REDIS_URL is unset, the cache layer must NEVER throw at
 * import or call time — the API degrades gracefully to "cache miss" forever.
 *
 * We use vi.resetModules() between tests so the lazy singleton inside
 * RedisClient.ts is re-evaluated for each scenario.
 */
describe("services/RedisClient resilience", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env["REDIS_URL"];
  });

  afterEach(() => {
    vi.doUnmock("ioredis");
  });

  it("getRedisClient returns null without throwing when REDIS_URL is unset", async () => {
    const mod = await import("../../../src/services/RedisClient.js");
    await expect(mod.getRedisClient()).resolves.toBeNull();
  });

  it("cacheGet returns null without throwing when REDIS_URL is unset", async () => {
    const mod = await import("../../../src/services/RedisClient.js");
    await expect(mod.cacheGet("k")).resolves.toBeNull();
  });

  it("cacheSet is a no-op without throwing when REDIS_URL is unset", async () => {
    const mod = await import("../../../src/services/RedisClient.js");
    await expect(mod.cacheSet("k", "v", 30)).resolves.toBeUndefined();
  });

  it("cacheDel is a no-op without throwing when REDIS_URL is unset", async () => {
    const mod = await import("../../../src/services/RedisClient.js");
    await expect(mod.cacheDel("k")).resolves.toBeUndefined();
  });

  it("cache calls survive a Redis client whose connect() rejects", async () => {
    process.env["REDIS_URL"] = "redis://invalid:0";
    vi.doMock("ioredis", () => {
      class FakeRedis {
        on() { return this; }
        async connect() { throw new Error("ECONNREFUSED"); }
        async get() { throw new Error("not connected"); }
        async setex() { throw new Error("not connected"); }
        async del() { throw new Error("not connected"); }
      }
      return { default: FakeRedis, Redis: FakeRedis };
    });

    const mod = await import("../../../src/services/RedisClient.js");
    await expect(mod.cacheGet("k")).resolves.toBeNull();
    await expect(mod.cacheSet("k", "v", 30)).resolves.toBeUndefined();
    await expect(mod.cacheDel("k")).resolves.toBeUndefined();
  });

  it("cache calls survive a Redis client whose ops throw mid-flight", async () => {
    process.env["REDIS_URL"] = "redis://localhost:6379";
    vi.doMock("ioredis", () => {
      class FakeRedis {
        on() { return this; }
        async connect() { /* succeed */ }
        async get() { throw new Error("connection lost"); }
        async setex() { throw new Error("connection lost"); }
        async del() { throw new Error("connection lost"); }
      }
      return { default: FakeRedis, Redis: FakeRedis };
    });

    const mod = await import("../../../src/services/RedisClient.js");
    await expect(mod.cacheGet("k")).resolves.toBeNull();
    await expect(mod.cacheSet("k", "v", 30)).resolves.toBeUndefined();
    await expect(mod.cacheDel("k")).resolves.toBeUndefined();
  });
});
