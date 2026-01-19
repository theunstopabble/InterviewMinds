import express from "express";
import { InterviewModel } from "../models/Interview";
import { requireAuth } from "../middleware/auth";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ Groq Client Setup (Ensure GROQ_API_KEY is in .env)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================================
// 1. End Interview & Analyze (PROTECTED 🔒)
// ============================================================================
router.post("/end", requireAuth, async (req: any, res: any) => {
  try {
    const { resumeId, history } = req.body;
    const userId = req.auth.userId;

    // Basic Validation
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "No conversation to analyze" });
    }

    // ✅ CRITICAL FIX: Check if user actually answered anything
    const userMessageCount = history.filter(
      (msg: any) => msg.role === "user",
    ).length;

    // 🛑 Case 1: User ne ek bhi jawaab nahi diya (Zero Score)
    if (userMessageCount === 0) {
      console.log(`⚠️ User ${userId} ended interview without answering.`);

      const emptyFeedback = {
        rating: 0,
        summary:
          "Interview terminated early. No answers provided by the candidate.",
        strengths: ["Resume uploaded successfully"],
        improvements: [
          "Attempt the interview questions next time",
          "Provide detailed technical answers",
        ],
      };

      // Save as 'Incomplete' interview
      const newInterview = await InterviewModel.create({
        userId,
        resumeId,
        conversation: history,
        feedback: emptyFeedback,
      });

      return res.json({ id: newInterview._id, feedback: emptyFeedback });
    }

    // 🟢 Case 2: User ne jawaab diye hain -> AI Analysis chalao
    console.log(`📊 Analyzing Interview for User: ${userId}...`);

    const transcript = history
      .map((msg: any) => `${msg.role}: ${msg.text}`)
      .join("\n");

    const systemPrompt = `
      You are a strict Senior Technical Hiring Manager. 
      Analyze the provided interview transcript based ONLY on the candidate's answers.
      
      --- RULES FOR SCORING ---
      1. IGNORE the Resume expertise. Rate ONLY based on what the candidate wrote in the chat.
      2. If answers are one-word or very short, give a LOW rating (below 4).
      3. If answers are incorrect or vague, criticize them in 'improvements'.
      4. Be honest and strict.
      
      --- OUTPUT REQUIREMENTS ---
      1. Response MUST be valid JSON.
      2. No markdown formatting.
      
      --- JSON STRUCTURE ---
      {
        "rating": <number 1-10>,
        "strengths": ["point 1", "point 2", "point 3"],
        "improvements": ["point 1", "point 2", "point 3"],
        "summary": "2 sentence professional summary of performance"
      }
    `;

    // Call Groq API (Llama 3.3)
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `--- TRANSCRIPT ---\n${transcript}` },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Low temperature for strict/consistent results
      response_format: { type: "json_object" },
    });

    const jsonText = completion.choices[0]?.message?.content || "{}";
    let feedbackData;

    try {
      feedbackData = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      feedbackData = {
        rating: 5,
        summary: "Error parsing detailed feedback, but interview was recorded.",
        strengths: ["Participation"],
        improvements: ["Technical clarity"],
      };
    }

    // Save to Database
    const newInterview = await InterviewModel.create({
      userId,
      resumeId,
      conversation: history,
      feedback: feedbackData,
    });

    console.log("✅ Interview Saved & Analyzed:", newInterview._id);
    res.json({ id: newInterview._id, feedback: feedbackData });
  } catch (error: any) {
    console.error("❌ Analysis Error:", error.message);
    res.status(500).json({ error: "Failed to analyze interview" });
  }
});

// ============================================================================
// 2. Get Single Interview Details (PROTECTED 🔒)
// ============================================================================
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const interview = await InterviewModel.findOne({
      _id: req.params.id,
      userId: req.auth.userId, // Ensure user can only see their own interview
    });

    if (!interview)
      return res.status(404).json({ error: "Not found or Unauthorized" });

    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// ============================================================================
// 3. Get User History for Dashboard (PROTECTED 🔒)
// ============================================================================
router.get("/history/all", requireAuth, async (req: any, res: any) => {
  try {
    const interviews = await InterviewModel.find({ userId: req.auth.userId })
      .sort({ date: -1 })
      .select("date feedback.rating feedback.summary");

    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
