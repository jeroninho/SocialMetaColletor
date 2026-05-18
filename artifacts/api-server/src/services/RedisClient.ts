import Redis from "ioredis";

let client: Redis | null = null;
let available = false;

const NAMESPACE = "smc:";

type MemEntry = { value: string; expiresAt: number };
const MEM_MAX = 500;
const memStore = new Map<string, MemEntry>();

const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
  errors: 0,
};

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memStore.delete(key);
    return null;
  }
  memStore.delete(key);
  memStore.set(key, entry);
  return entry.value;
}

function memSet(key: string, value: string, ttlSeconds: number): void {
  if (memStore.size >= MEM_MAX) {
    const oldest = memStore.keys().next().value;
    if (oldest !== undefined) memStore.delete(oldest);
  }
  memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memDelByPrefix(prefix: string): number {
  let removed = 0;
  for (const k of Array.from(memStore.keys())) {
    if (k.startsWith(prefix)) {
      memStore.delete(k);
      removed++;
    }
  }
  return removed;
}

export async function getRedisClient(): Promise<Redis | null> {
  if (client) return available ? client : null;

  const url = process.env["REDIS_URL"];
  if (!url) return null;

  try {
    client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });

    client.on("error", () => {
      available = false;
    });

    client.on("connect", () => {
      available = true;
    });

    await client.connect();
    available = true;
  } catch {
    available = false;
    client = null;
  }

  return available ? client : null;
}

function nsKey(key: string): string {
  return key.startsWith(NAMESPACE) ? key : NAMESPACE + key;
}

export async function cacheGet(key: string): Promise<string | null> {
  const k = nsKey(key);
  const mem = memGet(k);
  if (mem !== null) return mem;

  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    const value = await redis.get(k);
    if (value !== null) {
      // Promote Redis hit into the in-memory L1 so subsequent calls in this
      // process skip the network round-trip until the entry expires.
      try {
        const ttl = await redis.ttl(k);
        if (ttl > 0) memSet(k, value, ttl);
      } catch {
        // ignore TTL lookup failure; entry still served from Redis
      }
    }
    return value;
  } catch {
    stats.errors++;
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  const k = nsKey(key);
  memSet(k, value, ttlSeconds);
  stats.sets++;
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.setex(k, ttlSeconds, value);
  } catch {
    stats.errors++;
  }
}

export async function cacheDel(key: string): Promise<void> {
  const k = nsKey(key);
  const had = memStore.delete(k);
  if (had) stats.invalidations++;
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    const n = await redis.del(k);
    if (n > 0 && !had) stats.invalidations++;
  } catch {
    stats.errors++;
  }
}

/**
 * Invalidate all keys whose namespaced form starts with the given prefix
 * (e.g. "dashboard:" clears every dashboard cache entry).
 */
export async function cacheDelByPattern(prefix: string): Promise<number> {
  const fullPrefix = nsKey(prefix);
  const memRemoved = memDelByPrefix(fullPrefix);
  stats.invalidations += memRemoved;

  const redis = await getRedisClient();
  if (!redis) return memRemoved;

  try {
    let cursor = "0";
    let redisRemoved = 0;
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${fullPrefix}*`,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length) {
        await redis.del(...keys);
        redisRemoved += keys.length;
      }
    } while (cursor !== "0");
    stats.invalidations += redisRemoved;
    return memRemoved + redisRemoved;
  } catch {
    stats.errors++;
    return memRemoved;
  }
}

/**
 * In-flight promise registry to dedupe concurrent misses for the same key
 * (prevents cache stampedes against slow upstream APIs).
 */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Read-through cache helper. Returns parsed JSON value either from cache or
 * by invoking `compute()` and storing the result.
 *
 *   const data = await cached("dashboard:summary:user1", 60, async () => {
 *     return expensiveAggregation();
 *   });
 *
 * - `cacheIf`: only persist the result when this predicate returns true.
 *   Use it to avoid caching degraded/error payloads so transient upstream
 *   failures do not turn into multi-minute stale responses.
 * - Single-flight: concurrent calls for the same key share one `compute()`.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
  options?: {
    onHit?: () => void;
    onMiss?: () => void;
    cacheIf?: (value: T) => boolean;
  },
): Promise<T> {
  const raw = await cacheGet(key);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as T;
      stats.hits++;
      options?.onHit?.();
      return parsed;
    } catch {
      // corrupt entry — fall through to recompute
    }
  }
  stats.misses++;
  options?.onMiss?.();

  const nsK = nsKey(key);
  const pending = inflight.get(nsK) as Promise<T> | undefined;
  if (pending) return pending;

  const run = (async () => {
    try {
      const fresh = await compute();
      if (!options?.cacheIf || options.cacheIf(fresh)) {
        await cacheSet(key, JSON.stringify(fresh), ttlSeconds);
      }
      return fresh;
    } finally {
      inflight.delete(nsK);
    }
  })();
  inflight.set(nsK, run);
  return run;
}

export function getCacheStats() {
  const tier = client && available ? "redis+memory" : "memory";
  const hitRate =
    stats.hits + stats.misses > 0
      ? stats.hits / (stats.hits + stats.misses)
      : 0;
  return {
    tier,
    memoryEntries: memStore.size,
    memoryMax: MEM_MAX,
    redisAvailable: !!(client && available),
    ...stats,
    hitRate: parseFloat(hitRate.toFixed(4)),
  };
}
