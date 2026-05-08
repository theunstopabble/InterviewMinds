import express from "express";
import { InterviewModel } from "../models/Interview";
import { requireAuth } from "../middleware/auth";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { uploadMiddleware } from "../middleware/upload";
import { logger } from "../lib/logger";
import { validateBody, EndInterviewSchema, UploadVideoSchema } from "../lib/validation";

dotenv.config();

const router = express.Router();

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey: key });
}

// ============================================================================
// 1. END INTERVIEW & GENERATE REPORT (Weighted Ensemble Scoring 🧠)
// ============================================================================
interface AuthenticatedRequest extends express.Request {
  user?: { userId: string };
  auth?: { userId: string };
}

interface EndInterviewRequest {
  resumeId: string;
  history: { role: string; text: string }[];
}

// ============================================================================
// 1. END INTERVIEW & GENERATE REPORT (Weighted Ensemble Scoring 🧠)
// ============================================================================
router.post(
  "/end",
  requireAuth,
  validateBody(EndInterviewSchema),
  async (req: express.Request, res: express.Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId || authReq.auth?.userId;
    try {
      const { resumeId, history } = req.body as EndInterviewRequest;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // 1. Basic Validation
      if (!resumeId || typeof resumeId !== "string") {
        return res.status(400).json({ error: "Valid resumeId is required" });
      }
      if (!Array.isArray(history) || history.length === 0) {
        return res.status(400).json({ error: "No conversation to analyze" });
      }

      // 2. Check if user actually answered
      const userMessageCount = history.filter(
        (msg) => msg.role === "user",
      ).length;

      // 🛑 EARLY EXIT: Zero Score if no interaction
      if (userMessageCount === 0) {
        const emptyData = {
          score: 0,
          feedback: "Interview terminated early. No answers provided.",
          metrics: [
            { subject: "Content Quality", A: 0, fullMark: 100 },
            { subject: "Communication Skills", A: 0, fullMark: 100 },
            { subject: "Behavioral Indicators", A: 0, fullMark: 100 },
            { subject: "Domain Expertise", A: 0, fullMark: 100 },
          ],
        };

        const newInterview = new InterviewModel({
          userId,
          resumeId,
          messages: history,
          score: emptyData.score,
          feedback: emptyData.feedback,
          metrics: emptyData.metrics,
          createdAt: new Date(),
        });

        await newInterview.save();
        return res.json({
          id: newInterview._id,
          score: 0,
          metrics: emptyData.metrics,
        });
      }

      // 3. AI Analysis (Weighted Ensemble Logic)
      const systemPrompt = `
      You are an expert Technical Interview Evaluator.
      Analyze the provided interview transcript based ONLY on the candidate's answers.
      
      --- SCORING CRITERIA (WEIGHTED ENSEMBLE) ---
      Evaluate based on these 4 strict parameters:
      1. **Content Quality (40%)**: Accuracy of technical answers, code logic, and correctness.
      2. **Communication Skills (30%)**: Clarity, articulation, and language flow (English/Hinglish).
      3. **Behavioral Indicators (20%)**: Confidence, honesty about gaps, and problem-solving approach.
      4. **Domain Expertise (10%)**: Depth of knowledge in the specific tech stack (React, Node, etc.).

      --- OUTPUT REQUIREMENTS ---
      1. Return a **STRICT JSON** object.
      2. Calculate the 'score' as a weighted average: (Content*0.4 + Comm*0.3 + Behavior*0.2 + Domain*0.1).
      3. Structure must match exactly:
      {
        "score": number (0-100),
        "feedback": "string (concise summary of performance, mentioning strengths and weak areas)",
        "skills": [
          { "subject": "Content Quality", "A": number (0-100), "fullMark": 100 },
          { "subject": "Communication Skills", "A": number (0-100), "fullMark": 100 },
          { "subject": "Behavioral Indicators", "A": number (0-100), "fullMark": 100 },
          { "subject": "Domain Expertise", "A": number (0-100), "fullMark": 100 }
        ]
      }
    `;

      // Format chat for AI
      const conversationText = history
        .map((msg) => `${msg.role}: ${msg.text}`)
        .join("\n");

      let aiResponse: {
        score?: number;
        feedback?: string;
        skills?: { subject: string; A: number; fullMark?: number }[];
      } = {};

      try {
        const completion = await getGroqClient().chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: conversationText },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          // Strip markdown fences if the model wraps JSON
          const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
          aiResponse = JSON.parse(cleaned);
        }
      } catch (parseOrApiError: unknown) {
        const msg = parseOrApiError instanceof Error ? parseOrApiError.message : String(parseOrApiError);
        logger.error({ err: msg }, "AI analysis failed");
        // Continue with fallback defaults
      }

      // Default fallback if AI fails partial parsing
      const finalData = {
        score: typeof aiResponse.score === "number" ? aiResponse.score : 0,
        feedback: typeof aiResponse.feedback === "string" ? aiResponse.feedback : "Analysis incomplete.",
        metrics: Array.isArray(aiResponse.skills) ? aiResponse.skills : [
          { subject: "Content Quality", A: 0, fullMark: 100 },
          { subject: "Communication Skills", A: 0, fullMark: 100 },
          { subject: "Behavioral Indicators", A: 0, fullMark: 100 },
          { subject: "Domain Expertise", A: 0, fullMark: 100 },
        ],
      };

      // 4. Save to Database
      const interview = new InterviewModel({
        userId,
        resumeId,
        messages: history,
        score: finalData.score,
        feedback: finalData.feedback,
        metrics: finalData.metrics,
        createdAt: new Date(),
      });

      await interview.save();

      res.json({
        id: interview._id,
        score: interview.score,
        metrics: interview.metrics,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: msg, userId }, "feedback generation failed");
      res.status(500).json({ error: "Failed to generate report", details: msg });
    }
  },
);

// ============================================================================
// 2. GET USER HISTORY (DASHBOARD)
// ============================================================================
router.get(
  "/history",
  requireAuth,
  async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId || authReq.auth?.userId;

      const interviews = await InterviewModel.find({ userId })
        .select("score feedback createdAt metrics")
        .sort({ createdAt: -1 });

      res.json(interviews);
    } catch (error: unknown) {
      logger.error({ err: (error as Error).message }, "history fetch failed");
      res.status(500).json({ error: "Failed to fetch history" });
    }
  },
);

// ============================================================================
// 3. GET INTERVIEW DETAILS (FEEDBACK PAGE)
// ============================================================================
router.get(
  "/:id",
  requireAuth,
  async (req: express.Request, res: express.Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.userId || authReq.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const interview = await InterviewModel.findOne({
        _id: req.params.id,
        userId,
      });
      if (!interview)
        return res.status(404).json({ error: "Interview not found" });

      res.json(interview);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: msg, interviewId: req.params.id }, "interview fetch failed");
      res.status(500).json({ error: "Server Error" });
    }
  },
);

// ============================================================================
// 4. UPLOAD VIDEO (CLOUDINARY ☁️)
// ============================================================================
router.post(
  "/upload-video",
  requireAuth,
  uploadMiddleware.single("video"),
  async (req: express.Request, res: express.Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId || authReq.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { interviewId } = req.body as { interviewId: string };
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }
      if (!interviewId || typeof interviewId !== "string") {
        return res.status(400).json({ error: "Valid interviewId is required" });
      }

      // Ownership check
      const interview = await InterviewModel.findOne({ _id: interviewId, userId });
      if (!interview) {
        return res.status(404).json({ error: "Interview not found" });
      }

      const videoUrl = req.file.path; // Cloudinary URL

      await InterviewModel.findByIdAndUpdate(interviewId, {
        videoUrl: videoUrl,
      });

      res.json({
        message: "Video uploaded successfully",
        url: videoUrl,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ err: msg, userId, interviewId }, "video upload failed");
      res.status(500).json({ error: "Video upload failed", details: msg });
    }
  },
);

export default router;
