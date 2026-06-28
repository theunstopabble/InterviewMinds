import { requireAuth as clerkRequireAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { logger } from "../lib/logger";
import { syncUserFromClerk } from "../lib/syncUserProfile";
import { UserProfileModel } from "../models/UserProfile";

dotenv.config();

const LazySyncInterval = parseInt(process.env.USER_SYNC_INTERVAL || "3600000");

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const middleware = clerkRequireAuth();
  middleware(req, res, (err: unknown) => {
    if (err) {
      logger.error({ err: (err as Error).message }, "auth middleware error");
      return res
        .status(401)
        .json({ error: "Unauthorized! Please login first." });
    }

    const userId = (req as any).auth?.userId;
    if (userId && process.env.CLERK_SECRET_KEY) {
      UserProfileModel.findOne({ userId }).lean()
        .then(existing => {
          const needsSync = !existing ||
            !existing.name ||
            Date.now() - new Date(existing.lastSyncedAt).getTime() > LazySyncInterval;
          if (needsSync) syncUserFromClerk(userId);
        })
        .catch(() => {});
    }

    next();
  });
};


