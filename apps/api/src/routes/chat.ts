import express from "express";
import { ResumeModel } from "../models/Resume";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ 1. SETUP GROQ (Chat - Free & Fast)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ 2. SETUP GEMINI EMBEDDINGS (Context search)
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004",
  apiKey: process.env.GEMINI_API_KEY,
  maxRetries: 0,
});

// 🎭 PERSONA DEFINITIONS (The Brain)
const PERSONAS: any = {
  strict: {
    name: "Vikram",
    role: "Senior Staff Engineer (Strict & Technical)",
    style:
      "Direct, skeptical, asks deep 'Why' questions. No fluff. Cuts off vague answers.",
    tone: "Professional, slightly intimidating but fair.",
  },
  friendly: {
    name: "Neha",
    role: "Engineering Manager (Supportive)",
    style:
      "Encouraging, focuses on potential, asks about collaboration and projects.",
    tone: "Warm, professional, uses 'Great!', 'Interesting'.",
  },
  system: {
    name: "Sam",
    role: "System Architect",
    style:
      "Obsessed with scalability, databases, and tradeoffs (CAP theorem, Sharding).",
    tone: "Analytical, thoughtful.",
  },
};

router.post("/", async (req: any, res: any) => {
  try {
    // ✅ Extract 'mode' (default to 'strict' if not provided)
    const { message, resumeId, history, mode = "strict" } = req.body;

    if (!message || !resumeId)
      return res.status(400).json({ error: "Required fields missing" });

    let contextText = "";

    // --- STEP 1: CONTEXT RETRIEVAL ---
    try {
      // console.log("🔍 Vector Search...");
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
        {
          $project: {
            content: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ]);

      if (resumes.length > 0) {
        contextText = resumes[0].content?.substring(0, 5000) || "";
        // console.log("✅ Vector Search Success");
      } else {
        throw new Error("No vectors found");
      }
    } catch (err: any) {
      console.warn("⚠️ Vector Search failed, switching to fallback.");
      const r = await ResumeModel.findById(resumeId);
      if (r) {
        contextText = r.content.substring(0, 8000);
      }
    }

    // --- STEP 2: SELECT PERSONA ---
    // User ne jo mode bheja hai (strict/friendly/system), wo load karo
    const persona = PERSONAS[mode] || PERSONAS["strict"];

    // --- STEP 3: DYNAMIC PROMPT GENERATION ---
    const systemPrompt = `
      You are '${persona.name}', a ${persona.role}.
      
      --- YOUR STYLE ---
      ${persona.style}
      Tone: ${persona.tone}

      --- RESUME CONTEXT ---
      ${contextText}

      --- INSTRUCTIONS ---
      1. Language: **Hinglish** (Indian Tech style). Natural & Professional.
         - Example: "React mein Virtual DOM kaise kaam karta hai?" 
      2. Length: **Max 1-2 sentences**. Keep it extremely short for real-time voice latency.
      3. Task: Ask exactly **ONE** follow-up or new technical question based on the resume.
      4. If the user greets, introduce yourself as ${persona.name} and start immediately.
    `;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        });
      });
    }

    messages.push({ role: "user", content: message });

    // AI Call
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 150, // Short answers for speed
    });

    const aiText = completion.choices[0]?.message?.content || "Server Error.";

    res.json({ reply: aiText });
  } catch (error: any) {
    console.error("❌ Critical Chat Error:", error.message);
    res
      .status(500)
      .json({ error: "AI Service Failed", details: error.message });
  }
});

export default router;
