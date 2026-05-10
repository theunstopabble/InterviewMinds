import express from "express";
import { ResumeModel } from "../models/Resume";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../lib/validation";
import { z } from "zod";
import { logger } from "../lib/logger";
import ResumeVerificationService from "../lib/resumeVerification";

const router = express.Router();

const VerifyResumeSchema = z.object({
  resumeId: z.string().min(1, "Resume ID is required"),
  targetRole: z.string().optional(),
});

interface AuthenticatedRequest extends express.Request {
  auth?: { userId: string };
}

/**
 * POST /api/resume/verify
 * Verify resume content and extract entities
 */
router.post(
  "/verify",
  requireAuth,
  validateBody(VerifyResumeSchema),
  async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.auth?.userId;
      const { resumeId, targetRole } = req.body;

      // Verify ownership
      const resume = await ResumeModel.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      if (!resume.content || resume.content.length < 50) {
        return res.status(400).json({ 
          error: "Resume content not processed or too short for verification" 
        });
      }

      logger.info({ resumeId, userId, targetRole }, "Starting resume verification");

      const result = await ResumeVerificationService.verifyResume(
        resumeId,
        resume.content,
        targetRole
      );

      res.json({
        success: true,
        verification: result,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: msg }, "Resume verification failed");
      res.status(500).json({ error: "Verification failed", details: msg });
    }
  }
);

/**
 * GET /api/resume/:id/verification
 * Get existing verification result
 */
router.get(
  "/:id/verification",
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

      // If verification not done, return status
      if (!resume.verificationStatus || resume.verificationStatus === "unverified") {
        return res.json({
          status: "unverified",
          message: "Run /api/resume/verify to get verification results",
        });
      }

      // Return stored verification status
      res.json({
        status: resume.verificationStatus,
        verifiedAt: resume.verifiedAt,
        contentLength: resume.content.length,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: msg }, "Get verification failed");
      res.status(500).json({ error: "Failed to get verification", details: msg });
    }
  }
);

export default router;