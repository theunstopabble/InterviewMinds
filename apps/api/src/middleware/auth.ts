import { requireAuth as clerkRequireAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

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
  clerkRequireAuth(req, res, (err: unknown) => {
    if (err) {
      console.error("Auth Error Details:", (err as Error).message);
      return res
        .status(401)
        .json({ error: "Unauthorized! Please login first." });
    }
    next();
  });
};
