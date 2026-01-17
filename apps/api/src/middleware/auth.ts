import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

// .env load karo
dotenv.config();

// Debugging: Check karo ki key mili ya nahi (Console mein dikhega)
console.log("Checking Clerk Keys...");
console.log(
  "Publishable Key:",
  process.env.CLERK_PUBLISHABLE_KEY ? "✅ Found" : "❌ Missing"
);
console.log(
  "Secret Key:",
  process.env.CLERK_SECRET_KEY ? "✅ Found" : "❌ Missing"
);

export const requireAuth = ClerkExpressRequireAuth({
  // Hum explicitly keys yahan pass kar rahe hain taaki koi confusion na rahe
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,

  // Agar check fail hua to ye error dega
  onError: (err, req, res, next) => {
    console.error("Auth Error Details:", err);
    res.status(401).json({ error: "Unauthorized! Please login first." });
  },
});
