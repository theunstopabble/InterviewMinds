import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();

// Ye Clerk ka bana-banaya function hai jo check karega ki user login hai ya nahi
export const requireAuth = ClerkExpressRequireAuth({
  // Agar check fail hua to ye error dega
  onError: (err, req, res, next) => {
    console.error("Auth Error:", err);
    res.status(401).json({ error: "Unauthorized! Please login first." });
  },
});
