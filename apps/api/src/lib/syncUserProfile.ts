import axios from "axios";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "./logger";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API = "https://api.clerk.com/v1";

export async function syncUserFromClerk(userId: string): Promise<void> {
  try {
    if (!CLERK_SECRET_KEY) return;

    const { data } = await axios.get(`${CLERK_API}/users/${userId}`, {
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
      timeout: 5000,
    });

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || userId;
    const email = data.email_addresses?.[0]?.email_address || "";
    const avatarUrl = data.image_url || "";

    await UserProfileModel.findOneAndUpdate(
      { userId },
      { name, email, avatarUrl, lastSyncedAt: new Date() },
      { upsert: true, new: true },
    );
  } catch (err: unknown) {
    logger.warn({ err: (err as Error).message, userId }, "Failed to sync user from Clerk");
  }
}

export async function getOrCreateUserProfile(userId: string): Promise<{ name: string; email: string }> {
  const existing = await UserProfileModel.findOne({ userId }).lean();
  if (existing) return { name: existing.name, email: existing.email };

  await syncUserFromClerk(userId);
  const synced = await UserProfileModel.findOne({ userId }).lean();
  return { name: synced?.name || userId, email: synced?.email || "" };
}
