import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

// Debugging Logs (Optional - rakh sakte ho agar dekhna hai)
console.log("Checking Clerk Keys...");
console.log(
  "Publishable Key:",
  process.env.CLERK_PUBLISHABLE_KEY ? "✅ Found" : "❌ Missing",
);
console.log(
  "Secret Key:",
  process.env.CLERK_SECRET_KEY ? "✅ Found" : "❌ Missing",
);

// ✅ FIX: Empty Call. Clerk automatically reads keys from process.env
const clerkAuth = ClerkExpressRequireAuth();

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  clerkAuth(req, res, (err: any) => {
    if (err) {
      console.error("Auth Error Details:", err.message);
      return res
        .status(401)
        .json({ error: "Unauthorized! Please login first." });
    }
    next();
  });
};
