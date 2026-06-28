import { Router } from "express";
import { NotificationModel } from "../models/Notification";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const channel = req.query.channel as string | undefined;

    const filter: any = { userId };
    if (status) filter.status = status;
    if (channel) filter.channel = channel;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err, path: req.path }, "Failed to fetch notifications");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/unread-count", requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    const count = await NotificationModel.countDocuments({ userId, readAt: null });
    res.json({ success: true, data: { count } });
  } catch (err) {
    logger.error({ err, path: req.path }, "Failed to get unread count");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.patch("/:id/read", requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { readAt: new Date() },
      { new: true },
    );
    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true, data: notification });
  } catch (err) {
    logger.error({ err, path: req.path }, "Failed to mark notification as read");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.patch("/read-all", requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    const result = await NotificationModel.updateMany(
      { userId, readAt: null },
      { readAt: new Date() },
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (err) {
    logger.error({ err, path: req.path }, "Failed to mark all as read");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth?.userId;
    const { id } = req.params;
    const notification = await NotificationModel.findOneAndDelete({ _id: id, userId });
    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found" });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, path: req.path }, "Failed to delete notification");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
