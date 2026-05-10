import express, { Response } from "express";
import { z } from "zod";
import { InterviewModel } from "../models/Interview";
import { RBACRequest } from "../middleware/rbac";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = express.Router();

const MAX_EXPORT_LIMIT = 1000;

const ExportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  limit: z.coerce.number().min(1).max(MAX_EXPORT_LIMIT).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Simple CSV sanitizer to prevent injection
function sanitizeForCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── GET /api/export/interviews ──────────────────────────────────────────────
router.get(
  "/interviews",
  requireAuth,
  async (req: RBACRequest, res: Response) => {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const format = (req.query.format as string) || "json";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, MAX_EXPORT_LIMIT);
      const offset = parseInt(req.query.offset as string) || 0;

      const [interviews, total] = await Promise.all([
        InterviewModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        InterviewModel.countDocuments({ userId }),
      ]);

      if (format === "csv") {
        const headers = ["id", "userId", "resumeId", "score", "feedback", "status", "createdAt"];
        const rows = interviews.map((i: any) => [
          sanitizeForCSV(i._id?.toString?.() || i._id),
          sanitizeForCSV(i.userId),
          sanitizeForCSV(i.resumeId),
          sanitizeForCSV(i.score),
          sanitizeForCSV(i.feedback),
          sanitizeForCSV(i.status),
          sanitizeForCSV(i.createdAt?.toISOString?.() || i.createdAt),
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="interviews.csv"');
        res.status(200).send(csv);
        return;
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", 'attachment; filename="interviews.json"');
      res.status(200).json({
        data: interviews.map((i: any) => ({
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
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + interviews.length < total,
        },
      });
    } catch (err: unknown) {
      logger.error({ err: (err as Error).message }, "export interviews failed");
      res.status(500).json({ error: "Export failed" });
    }
  },
);

export default router;