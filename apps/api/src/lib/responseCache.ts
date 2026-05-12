import { getRedisClient } from "./redis";
import { logger } from "./logger";

export interface CacheOptions {
  ttl: number;
  prefix?: string;
}

export interface CachedResponse<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const DEFAULT_TTL = 300;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    if (!redis) return null;

    const cached = await redis.get(`cache:${key}`);
    if (!cached) return null;

    const parsed: CachedResponse<T> = JSON.parse(cached);
    
    if (Date.now() > parsed.expiresAt) {
      await redis.del(`cache:${key}`);
      return null;
    }

    logger.debug({ key }, "Cache hit");
    return parsed.data;
  } catch (error) {
    logger.error({ err: error, key }, "Cache get error");
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  data: T,
  options: CacheOptions = { ttl: DEFAULT_TTL }
): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    const cached: CachedResponse<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (options.ttl * 1000),
    };

    await redis.setex(`cache:${options.prefix || "default"}:${key}`, options.ttl, JSON.stringify(cached));
    logger.debug({ key, ttl: options.ttl }, "Cache set");
  } catch (error) {
    logger.error({ err: error, key }, "Cache set error");
  }
}

export async function cacheDelete(key: string, prefix?: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    await redis.del(`cache:${prefix || "default"}:${key}`);
    logger.debug({ key }, "Cache deleted");
  } catch (error) {
    logger.error({ err: error, key }, "Cache delete error");
  }
}

export async function cacheClear(prefix?: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) return;

    const pattern = prefix ? `cache:${prefix}:*` : "cache:*";
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info({ keys: keys.length }, "Cache cleared");
    }
  } catch (error) {
    logger.error({ err: error }, "Cache clear error");
  }
}

export async function cacheWarmUp(
  keys: Array<{ key: string; data: any; ttl?: number }>
): Promise<void> {
  const promises = keys.map(({ key, data, ttl }) =>
    cacheSet(key, data, { ttl: ttl || DEFAULT_TTL })
  );
  
  await Promise.all(promises);
  logger.info({ keys: keys.length }, "Cache warmed up");
}

export function createCacheKey(...parts: string[]): string {
  return parts.join(":");
}

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
};

export const CACHE_PREFIXES = {
  USER: "user",
  INTERVIEW: "interview",
  RESUME: "resume",
  ANALYTICS: "analytics",
  QUESTIONS: "questions",
};