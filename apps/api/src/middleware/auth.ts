import { requireAuth as clerkRequireAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { logger } from "../lib/logger";

dotenv.config();

// Debugging Logs (Optional)
// console.log("Checking Clerk Keys...");
// console.log(
//   "Publishable Key:",
//   process.env.CLERK_PUBLISHABLE_KEY ? "✅ Found" : "❌ Missing",
// );
// console.log(
//   "Secret Key:",
//   process.env.CLERK_SECRET_KEY ? "✅ Found" : "❌ Missing",
// );

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
