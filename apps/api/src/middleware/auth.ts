import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { Request, Response, NextFunction } from "express"; // ✅ Types Import kiye
import dotenv from "dotenv";

// .env load karo
dotenv.config();

// Debugging: Check karo ki key mili ya nahi
console.log("Checking Clerk Keys...");
console.log(
  "Publishable Key:",
  process.env.CLERK_PUBLISHABLE_KEY ? "✅ Found" : "❌ Missing",
);
console.log(
  "Secret Key:",
  process.env.CLERK_SECRET_KEY ? "✅ Found" : "❌ Missing",
);

// 1. Clerk Middleware Instance Banao
const clerkAuth = ClerkExpressRequireAuth({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

// 2. Wrapper Function Banao (Types Fix karne ke liye)
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  clerkAuth(req, res, (err: any) => {
    if (err) {
      console.error("Auth Error Details:", err);
      // Agar error aaye (jaise token missing/invalid), to 401 bhejo
      return res
        .status(401)
        .json({ error: "Unauthorized! Please login first." });
    }
    // Agar sab sahi hai, to agle route par jao
    next();
  });
};
