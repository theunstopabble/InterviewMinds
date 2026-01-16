import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { InterviewModel } from "../models/Interview";
import { requireAuth } from "../middleware/auth"; // ✅ Auth Middleware Imported
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. Interview Save & Analyze Route (PROTECTED 🔒)
router.post("/end", requireAuth, async (req: any, res: any) => {
  try {
    const { resumeId, history } = req.body;

    // ✅ Fix: User ID Clerk se nikalo
    const userId = req.auth.userId;

    if (!history || history.length === 0) {
      return res.status(400).json({ error: "No conversation to analyze" });
    }

    console.log(`📊 Analyzing Interview for User: ${userId}...`);

    // Chat History ko text mein badlo
    const transcript = history
      .map((msg: any) => `${msg.role}: ${msg.text}`)
      .join("\n");

    // AI ko Judge banao
    const prompt = `
      You are a Senior Technical Hiring Manager. Analyze this interview transcript based on the candidate's answers.
      
      --- TRANSCRIPT ---
      ${transcript}
      
      --- OUTPUT FORMAT (JSON ONLY) ---
      Respond strictly with this JSON structure (no markdown, no extra text):
      {
        "rating": <number 1-10>,
        "strengths": ["point 1", "point 2"],
        "improvements": ["point 1", "point 2"],
        "summary": "2 sentence summary of performance"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response
      .text()
      .replace(/```json|```/g, "")
      .trim(); // Cleanup

    let feedbackData;
    try {
      feedbackData = JSON.parse(jsonText);
    } catch (e) {
      feedbackData = {
        rating: 5,
        summary: "Could not parse detailed feedback.",
        strengths: [],
        improvements: [],
      };
    }

    // ✅ Asli User ID ke saath save karein
    const newInterview = await InterviewModel.create({
      userId: userId, // Ab ye variable defined hai
      resumeId,
      conversation: history,
      feedback: feedbackData,
    });

    console.log("✅ Interview Saved & Analyzed:", newInterview._id);
    res.json({ id: newInterview._id, feedback: feedbackData });
  } catch (error: any) {
    console.error("❌ Analysis Error:", error);
    res.status(500).json({ error: "Failed to analyze interview" });
  }
});

// 2. Get Single Interview Details (PROTECTED 🔒)
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    // ✅ Security Fix: Sirf wahi interview dikhao jo is user ka ho
    const interview = await InterviewModel.findOne({
      _id: req.params.id,
      userId: req.auth.userId,
    });

    if (!interview)
      return res.status(404).json({ error: "Not found or Unauthorized" });

    res.json(interview);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 3. Get User History for Dashboard (PROTECTED 🔒)
router.get("/history/all", requireAuth, async (req: any, res: any) => {
  try {
    // Sirf logged-in user ka data
    const interviews = await InterviewModel.find({ userId: req.auth.userId })
      .sort({ date: -1 }) // Latest pehle
      .select("date feedback.rating feedback.summary"); // Sirf summary bhejo (Fast Load)

    res.json(interviews);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
