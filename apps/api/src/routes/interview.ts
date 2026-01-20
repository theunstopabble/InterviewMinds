import express from "express";
import { InterviewModel } from "../models/Interview";
import { requireAuth } from "../middleware/auth";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================================
// 1. END INTERVIEW & GENERATE REPORT (PROTECTED 🔒)
// ============================================================================
router.post("/end", requireAuth, async (req: any, res: any) => {
  try {
    const { resumeId, history } = req.body;
    // Note: Adjust 'req.user.userId' if your auth middleware uses 'req.auth.userId'
    const userId = req.user?.userId || req.auth?.userId;

    // 1. Basic Validation
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "No conversation to analyze" });
    }

    // 2. Check if user actually answered (Prevent AI hallucination on empty chat)
    const userMessageCount = history.filter(
      (msg: any) => msg.role === "user",
    ).length;

    if (userMessageCount === 0) {
      console.log(`⚠️ User ${userId} ended interview without answering.`);

      const emptyData = {
        score: 0,
        feedback: "Interview terminated early. No answers provided.",
        metrics: [
          { subject: "Technical", A: 0, fullMark: 100 },
          { subject: "Communication", A: 0, fullMark: 100 },
          { subject: "Problem Solving", A: 0, fullMark: 100 },
          { subject: "Confidence", A: 0, fullMark: 100 },
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

    // 3. AI Analysis (Groq)
    const systemPrompt = `
      You are an expert Technical Interview Evaluator.
      Analyze the provided interview transcript based ONLY on the candidate's answers.
      
      --- OUTPUT REQUIREMENTS ---
      1. Return a **STRICT JSON** object.
      2. No markdown, no introductory text.
      3. Structure must match exactly:
      {
        "score": number (0-100 overall score),
        "feedback": "string (2-3 sentences summary of performance)",
        "skills": [
          { "subject": "Technical", "A": number (0-100), "fullMark": 100 },
          { "subject": "Communication", "A": number (0-100), "fullMark": 100 },
          { "subject": "Problem Solving", "A": number (0-100), "fullMark": 100 },
          { "subject": "Confidence", "A": number (0-100), "fullMark": 100 }
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
        { subject: "Technical", A: 0, fullMark: 100 },
        { subject: "Communication", A: 0, fullMark: 100 },
        { subject: "Problem Solving", A: 0, fullMark: 100 },
        { subject: "Confidence", A: 0, fullMark: 100 },
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
// 2. GET USER HISTORY (NEW ROUTE FOR DASHBOARD) 🕒
// ============================================================================
router.get("/history", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId || req.auth?.userId;

    // Fetch interviews for this user, sorted by newest first
    const interviews = await InterviewModel.find({ userId })
      .select("score feedback createdAt metrics") // Optimize: Don't fetch full chat history
      .sort({ createdAt: -1 });

    res.json(interviews);
  } catch (error: any) {
    console.error("History Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ============================================================================
// 3. GET INTERVIEW DETAILS (For Feedback Page)
// ============================================================================
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const interview = await InterviewModel.findById(req.params.id);
    if (!interview)
      return res.status(404).json({ error: "Interview not found" });

    // Optional: Check if the user owns this interview
    // if (interview.userId.toString() !== req.user.userId) return res.status(403).json({ error: "Unauthorized" });

    res.json(interview);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
