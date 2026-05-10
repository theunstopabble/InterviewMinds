import express from "express";
import multer from "multer";
import { ResumeModel } from "../models/Resume";
import { requireAuth } from "../middleware/auth";
import dotenv from "dotenv";
import { logger } from "../lib/logger";
import { resumesUploaded } from "../lib/metrics";
import { resumeQueue } from "../lib/queue";

dotenv.config();

interface AuthenticatedRequest extends express.Request {
  auth?: { userId: string };
  file?: Express.Multer.File;
}

const router = express.Router();

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["application/pdf"];

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error("Only PDF files are allowed"));
    return;
  }
  cb(null, true);
};

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_RESUME_SIZE },
  fileFilter,
});

router.post(
  "/upload",
  requireAuth,
  upload.single("resume"),
  async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.auth?.userId;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create placeholder resume immediately
      const newResume = await ResumeModel.create({
        userId: userId,
        fileName: req.file.originalname,
        content: "",
        chunks: [],
      });

      // Offload heavy processing to BullMQ
      await resumeQueue.add("process-resume", {
        resumeId: newResume._id.toString(),
        userId: userId,
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer.toString("base64"),
      });

      resumesUploaded.inc();
      logger.info({ resumeId: newResume._id }, "Resume upload queued for processing");

      res.json({
        message: "Resume uploaded successfully. Processing in background.",
        id: newResume._id,
        previewText: "Processing...",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: msg }, "Resume upload failed");
      res.status(500).json({
        error: "Failed to upload resume",
        details: msg,
      });
    }
  },
);

router.get(
  "/:id/status",
  requireAuth,
  async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.auth?.userId;
      const resumeId = req.params.id;

      const resume = await ResumeModel.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const isProcessed = resume.content.length > 0;
      res.json({
        id: resume._id,
        status: isProcessed ? "completed" : "processing",
        previewText: isProcessed ? resume.content.substring(0, 100) + "..." : "Processing...",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to check status", details: msg });
    }
  },
);

export default router;