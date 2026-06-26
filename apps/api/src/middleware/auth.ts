import { requireAuth as clerkRequireAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { logger } from "../lib/logger";

dotenv.config();


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
    next();
  });
};
