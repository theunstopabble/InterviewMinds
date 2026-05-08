import Redis from "ioredis";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ============================================================================
// REDIS CLIENT — Production-Ready Connection Management
// ============================================================================

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    showFriendlyErrorStack: process.env.NODE_ENV === "development",
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn({ attempt: times, delay }, "Redis retry");
      return delay;
    },
    reconnectOnError: (err) => {
      logger.error({ err: err.message }, "Redis reconnect triggered");
      return true;
    },
  });

  redisClient.on("connect", () => {
    logger.info("Redis connected");
  });

  redisClient.on("error", (err) => {
    logger.error({ err: err.message }, "Redis error");
  });

  redisClient.on("close", () => {
    logger.warn("Redis connection closed");
  });

  return redisClient;
}

// Graceful shutdown
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis client closed gracefully");
  }
}

// ============================================================================
// CACHE UTILITIES — Key strategies + serialization
// ============================================================================

function buildKey(namespace: string, id: string): string {
  return `im:${namespace}:${id}`;
}

export async function cacheGet<T>(namespace: string, id: string): Promise<T | null> {
  const client = getRedisClient();
  try {
    const raw = await client.get(buildKey(namespace, id));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error({ err, namespace, id }, "cache get failed");
    return null;
  }
}

export async function cacheSet(
  namespace: string,
  id: string,
  value: unknown,
  ttlSeconds: number = 300,
): Promise<void> {
  const client = getRedisClient();
  try {
    await client.setex(buildKey(namespace, id), ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.error({ err, namespace, id }, "cache set failed");
  }
}

export async function cacheDel(namespace: string, id: string): Promise<void> {
  const client = getRedisClient();
  try {
    await client.del(buildKey(namespace, id));
  } catch (err) {
    logger.error({ err, namespace, id }, "cache delete failed");
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    logger.error({ err, pattern }, "cache invalidate pattern failed");
  }
}

// ============================================================================
// HIGH-LEVEL WRAPPER — Memoize expensive async functions
// ============================================================================

export function withCache<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    namespace: string;
    ttlSeconds: number;
    keyFn: (...args: TArgs) => string;
  },
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = options.keyFn(...args);
    const cached = await cacheGet<TReturn>(options.namespace, key);
    if (cached !== null) {
      logger.debug({ namespace: options.namespace, key }, "cache hit");
      return cached;
    }

    const result = await fn(...args);
    await cacheSet(options.namespace, key, result, options.ttlSeconds);
    logger.debug({ namespace: options.namespace, key }, "cache miss, stored");
    return result;
  };
}
