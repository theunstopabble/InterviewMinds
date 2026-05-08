import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { getRedisClient } from "./redis";
import { logger } from "./logger";

/**
 * Request deduplication middleware.
 * Prevents duplicate concurrent requests using a Redis lock key.
 * Key is derived from userId + path + sorted body hash.
 *
 * @param ttlSeconds — lock duration (default 10s)
 */
export function deduplicate(ttlSeconds: number = 10) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return next(); // skip dedup for unauthenticated requests
    }

    // Only dedup POST/PUT/PATCH mutating requests
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
      return next();
    }

    const bodyHash = createHash("sha256")
      .update(JSON.stringify(req.body) || "")
      .digest("hex");
    const dedupKey = `dedup:${userId}:${req.path}:${bodyHash}`;

    try {
      const redis = getRedisClient();
      const acquired = await redis.set(dedupKey, "1", "EX", ttlSeconds, "NX");
      if (!acquired) {
        logger.warn({ key: dedupKey, path: req.path, userId }, "deduplicated request");
        return res.status(429).json({
          error: "Duplicate request in progress",
          message: `Please wait ${ttlSeconds}s before retrying`,
          retryAfter: ttlSeconds,
        });
      }

      // Release lock after response finishes (fire-and-forget)
      res.on("finish", () => {
        redis.del(dedupKey).catch(() => {
          /* ignore cleanup errors */
        });
      });

      res.on("close", () => {
        redis.del(dedupKey).catch(() => {
          /* ignore cleanup errors */
        });
      });

      next();
    } catch (err: unknown) {
      // If Redis is down, skip dedup to avoid blocking requests
      logger.warn({ err: (err as Error).message }, "dedup redis unavailable — allowing request");
      next();
    }
  };
}
