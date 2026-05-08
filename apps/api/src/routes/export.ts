import express, { Response } from "express";
import { InterviewModel } from "../models/Interview";
import { RBACRequest } from "../middleware/rbac";
import { logger } from "../lib/logger";

const router = express.Router();

// ─── GET /api/export/interviews ──────────────────────────────────────────────
router.get("/interviews", async (req: RBACRequest, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const format = (req.query.format as string) || "json";
    const interviews = await InterviewModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (format === "csv") {
      // Simple CSV serialization — no external library needed for MVP
      const headers = ["id", "userId", "resumeId", "score", "feedback", "status", "createdAt"];
      const rows = interviews.map((i: any) => [
        i._id?.toString?.() || i._id,
        i.userId,
        i.resumeId,
        i.score,
        `"${(i.feedback || "").replace(/"/g, '""')}"`,
        i.status,
        i.createdAt?.toISOString?.() || i.createdAt,
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="interviews.csv"');
      res.status(200).send(csv);
      return;
    }

    // Default: JSON
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="interviews.json"');
    res.status(200).json(
      interviews.map((i: any) => ({
        id: i._id?.toString?.() || i._id,
        userId: i.userId,
        resumeId: i.resumeId,
        score: i.score,
        feedback: i.feedback,
        metrics: i.metrics,
        status: i.status,
        createdAt: i.createdAt?.toISOString?.() || i.createdAt,
        videoUrl: i.videoUrl,
      })),
    );
  } catch (err: unknown) {
    logger.error({ err: (err as Error).message }, "export interviews failed");
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
