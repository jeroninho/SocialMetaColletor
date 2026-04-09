import Redis from "ioredis";

let client: Redis | null = null;
let available = false;

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

export async function cacheGet(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch {
    // Redis not available — continue without cache
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}
