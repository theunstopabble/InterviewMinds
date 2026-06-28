import { Router, Request, Response } from "express";
import { Webhook } from "svix";
import { UserProfileModel } from "../models/UserProfile";
import { logger } from "../lib/logger";

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "CLERK_WEBHOOK_SECRET not configured" });
    return;
  }

  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing Svix headers" });
    return;
  }

  let payload: any;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(JSON.stringify(req.body), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const eventType = payload.type as string;
  const data = payload.data;

  if (!data?.id) {
    res.status(400).json({ error: "Missing user id in payload" });
    return;
  }

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || data.id;
      const email = data.email_addresses?.[0]?.email_address || "";
      const avatarUrl = data.image_url || "";

      await UserProfileModel.findOneAndUpdate(
        { userId: data.id },
        { name, email, avatarUrl, lastSyncedAt: new Date() },
        { upsert: true, new: true },
      );
      logger.info({ userId: data.id, name, eventType }, "User profile synced via Clerk webhook");
    }

    if (eventType === "user.deleted") {
      await UserProfileModel.deleteOne({ userId: data.id });
      logger.info({ userId: data.id }, "User profile removed via Clerk webhook");
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err: (err as Error).message, eventType }, "Clerk webhook handler error");
    res.status(500).json({ error: "Webhook handler error" });
  }
});

export default router;
