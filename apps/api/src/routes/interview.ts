import express from "express";
import { InterviewModel } from "../models/Interview";
import { requireAuth } from "../middleware/auth";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { uploadMiddleware } from "../middleware/upload"; // ✅ Use Cloudinary Middleware

dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================================
// 1. END INTERVIEW & GENERATE REPORT (Weighted Ensemble Scoring 🧠)
// ============================================================================
router.post("/end", requireAuth, async (req: any, res: any) => {
  try {
    const { resumeId, history } = req.body;
    const userId = req.user?.userId || req.auth?.userId;

    // 1. Basic Validation
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "No conversation to analyze" });
    }

    // 2. Check if user actually answered
    const userMessageCount = history.filter(
      (msg: any) => msg.role === "user",
    ).length;

    // 🛑 EARLY EXIT: Zero Score if no interaction
    if (userMessageCount === 0) {
      console.log(`⚠️ User ${userId} ended interview without answering.`);

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
      .map((msg: any) => `${msg.role}: ${msg.text}`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: conversationText },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2, // Low temp for consistent JSON
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0]?.message?.content || "{}",
    );

    // Default fallback if AI fails partial parsing
    const finalData = {
      score: aiResponse.score || 0,
      feedback: aiResponse.feedback || "Analysis incomplete.",
      metrics: aiResponse.skills || [
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
  } catch (error: any) {
    console.error("Feedback Generation Error:", error.message);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ============================================================================
// 2. GET USER HISTORY (DASHBOARD)
// ============================================================================
router.get("/history", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId || req.auth?.userId;

    const interviews = await InterviewModel.find({ userId })
      .select("score feedback createdAt metrics")
      .sort({ createdAt: -1 });

    res.json(interviews);
  } catch (error: any) {
    console.error("History Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ============================================================================
// 3. GET INTERVIEW DETAILS (FEEDBACK PAGE)
// ============================================================================
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const interview = await InterviewModel.findById(req.params.id);
    if (!interview)
      return res.status(404).json({ error: "Interview not found" });

    res.json(interview);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ============================================================================
// 4. UPLOAD VIDEO (CLOUDINARY ☁️)
// ============================================================================
router.post(
  "/upload-video",
  requireAuth,
  uploadMiddleware.single("video"),
  async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const { interviewId } = req.body;
      const videoUrl = req.file.path; // Cloudinary URL

      console.log(`☁️ Video Uploaded to Cloudinary: ${videoUrl}`);

      await InterviewModel.findByIdAndUpdate(interviewId, {
        videoUrl: videoUrl,
      });

      res.json({
        message: "Video uploaded successfully",
        url: videoUrl,
      });
    } catch (error) {
      console.error("Cloud Upload Error:", error);
      res.status(500).json({ error: "Video upload failed" });
    }
  },
);

export default router;
