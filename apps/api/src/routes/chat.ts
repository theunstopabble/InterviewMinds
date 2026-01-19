import express from "express";
import { ResumeModel } from "../models/Resume";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ 1. SETUP GROQ (Chat ke liye - Free & Fast)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ 2. SETUP GEMINI EMBEDDINGS (Context search ke liye - Matches Upload Logic)
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004", // Must match 'resume.ts'
  apiKey: process.env.GEMINI_API_KEY,
  maxRetries: 0,
});

router.post("/", async (req: any, res: any) => {
  try {
    const { message, resumeId, history } = req.body;

    if (!message || !resumeId)
      return res.status(400).json({ error: "Required fields missing" });

    let contextText = "";

    // --- STEP 1: CONTEXT RETRIEVAL (Gemini Embeddings + MongoDB) ---
    try {
      console.log("🔍 Attempting Vector Search...");

      // 1. User ke message ko vector mein badlo
      const queryVector = await embeddings.embedQuery(message);

      // 2. MongoDB mein search karo
      const resumes = await ResumeModel.aggregate([
        {
          $vectorSearch: {
            index: "vector_index", // Atlas Index Name
            path: "chunks.embedding", // Path to vector
            queryVector: queryVector,
            numCandidates: 50,
            limit: 3,
          },
        },
        {
          $project: {
            content: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ]);

      if (resumes.length > 0) {
        // Top match ka content uthao
        contextText = resumes[0].content?.substring(0, 5000) || "";
        console.log("✅ Vector Search Success");
      } else {
        throw new Error("No vectors found (Similarity too low or Indexing)");
      }
    } catch (err: any) {
      console.error("🔴 Vector Search Warning:", err.message);
      console.warn("⚠️ Switching to Basic Mode (Reading raw resume from DB).");

      // Fallback: Agar vector search fail ho, toh seedha ID se utha lo
      const r = await ResumeModel.findById(resumeId);
      if (r) {
        contextText = r.content.substring(0, 8000);
      }
    }

    // --- STEP 2: GENERATE RESPONSE (Groq - Llama 3) ---
    // Gemini ka quota khatam ho gaya tha, isliye Groq use kar rahe hain

    const systemPrompt = `
      You are an expert Technical Interviewer for InterviewMinds.ai.
      
      --- RESUME CONTEXT ---
      ${contextText}
      
      --- INSTRUCTIONS ---
      1. Reply in HINGLISH (Mix of Hindi & English).
      2. Ask exactly ONE technical question based on the Resume Context.
      3. Keep it professional but conversational.
      4. Do not provide the answer, just ask the question.
      5. If the user says "Hi" or "Intro", start with a welcome message referencing their resume skills.
    `;

    // History format karna Groq ke liye
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        });
      });
    }

    // Current message add karo
    messages.push({ role: "user", content: message });

    // AI ko call karo
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile", // Super Fast & Free Limit
      temperature: 0.7,
    });

    const aiText =
      completion.choices[0]?.message?.content ||
      "Server Error: No response from AI.";

    res.json({ reply: aiText });
  } catch (error: any) {
    console.error("❌ Critical Chat Error:", error.message);
    res
      .status(500)
      .json({ error: "AI Service Failed", details: error.message });
  }
});

export default router;
