import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ResumeModel } from "../models/Resume";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "embedding-001",
  apiKey: process.env.GEMINI_API_KEY,
  maxRetries: 0, // ⚡ IMPORTANT: Retry mat karna, seedha fallback par jana
});

router.post("/", async (req: any, res: any) => {
  try {
    const { message, resumeId, history } = req.body;

    if (!message || !resumeId)
      return res.status(400).json({ error: "Required fields missing" });

    // --- STEP 1: CONTEXT RETRIEVAL (Circuit Breaker Logic) ---
    let contextText = "";

    try {
      // Koshish karo Vector Search use karne ki (Smart Way)
      console.log("🔍 Attempting Vector Search...");
      const queryVector = await embeddings.embedQuery(message);

      const resumes = await ResumeModel.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "chunks.embedding",
            queryVector: queryVector,
            numCandidates: 50,
            limit: 3,
          },
        },
        { $project: { chunks: 1, score: { $meta: "vectorSearchScore" } } },
      ]);

      if (resumes.length > 0 && resumes[0].chunks) {
        // Filhal fallback raw content par hi rakhte hain safety ke liye
        // Production mein hum yahan specific chunks nikalte hain
        const r = await ResumeModel.findById(resumeId);
        if (r) contextText = r.content.substring(0, 5000);
      } else {
        throw new Error("No vectors found");
      }
      console.log("✅ Vector Search Success");
    } catch (err) {
      // Agar API Limit khatam ho gayi ya koi error aaya -> Fallback karo (Desi Jugaad)
      console.warn(
        "⚠️ Vector Search Failed (Rate Limit or Indexing), switching to Basic Mode."
      );

      const r = await ResumeModel.findById(resumeId);
      if (r) {
        // Resume ka shuruwat ka hissa utha lo (Fallback)
        contextText = r.content.substring(0, 8000);
      }
    }

    // --- STEP 2: GENERATE RESPONSE ---
    const conversationHistory = history
      ? history
          .map(
            (msg: any) =>
              `${msg.role === "user" ? "Candidate" : "Interviewer"}: ${
                msg.text
              }`
          )
          .join("\n")
      : "No previous conversation.";

    const prompt = `
      You are an expert Technical Interviewer.
      
      --- RESUME CONTEXT ---
      ${contextText}
      
      --- HISTORY ---
      ${conversationHistory}
      
      --- CANDIDATE INPUT ---
      "${message}"

      --- INSTRUCTIONS ---
      1. Reply in HINGLISH if input is Hindi. English if English.
      2. Ask technical questions based on the Resume Context.
      3. Keep it short (2-3 sentences).
      4. DO NOT use Devanagari script.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    res.json({ reply: aiText });
  } catch (error: any) {
    console.error("❌ Chat Error:", error);
    res.status(500).json({ error: "AI Failed", details: error.message });
  }
});

export default router;
