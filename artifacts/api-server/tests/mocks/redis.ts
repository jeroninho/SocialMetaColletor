/**
 * Minimal in-memory Redis client compatible with the subset of `ioredis` the
 * app uses (`get`, `set` with EX TTL, `del`, `quit`, error events).
 *
 * Tests can call `installRedisMock()` BEFORE the app code imports its
 * RedisClient module to make the cache layer use this fake.
 */
import { vi } from "vitest";

export interface FakeRedisOptions {
  /** When true, every command rejects with a synthetic outage error. */
  failAll?: boolean;
}

export class FakeRedis {
  private store = new Map<string, { v: string; expiresAt: number | null }>();
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor(public options: FakeRedisOptions = {}) {}

  on(event: string, cb: (...args: unknown[]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const cb of this.listeners.get(event) ?? []) cb(...args);
  }

  async get(key: string): Promise<string | null> {
    if (this.options.failAll) throw new Error("redis_outage");
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.v;
  }

  async set(
    key: string,
    value: string,
    ...rest: unknown[]
  ): Promise<"OK"> {
    if (this.options.failAll) throw new Error("redis_outage");
    let expiresAt: number | null = null;
    for (let i = 0; i < rest.length; i++) {
      if (typeof rest[i] === "string" && (rest[i] as string).toUpperCase() === "EX") {
        const ttl = Number(rest[i + 1]);
        if (Number.isFinite(ttl) && ttl > 0) expiresAt = Date.now() + ttl * 1000;
      }
    }
    this.store.set(key, { v: value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    if (this.options.failAll) throw new Error("redis_outage");
    return this.store.delete(key) ? 1 : 0;
  }

  async quit(): Promise<"OK"> {
    return "OK";
  }
}

export function installRedisMock(opts: FakeRedisOptions = {}): {
  client: FakeRedis;
  restore: () => void;
} {
  const client = new FakeRedis(opts);
  vi.doMock("ioredis", () => ({
    default: vi.fn(() => client),
    Redis: vi.fn(() => client),
  }));
  return {
    client,
    restore: () => vi.doUnmock("ioredis"),
  };
}
