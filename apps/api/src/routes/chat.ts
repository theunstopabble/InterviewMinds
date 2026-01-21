import express from "express";
import { ResumeModel } from "../models/Resume";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ 1. SETUP GROQ (Chat - Fast Llama 3)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ 2. SETUP GEMINI EMBEDDINGS (Context search)
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004",
  apiKey: process.env.GEMINI_API_KEY,
  maxRetries: 1,
});

// 🎭 PERSONA DEFINITIONS
const PERSONAS: any = {
  strict: {
    name: "Vikram",
    role: "Senior Staff Engineer (Strict & Technical)",
    style:
      "Direct, skeptical, asks deep 'Why' questions. Cuts off vague answers. Focuses on system depth.",
    tone: "Professional, slightly intimidating but fair.",
  },
  friendly: {
    name: "Neha",
    role: "Engineering Manager (Supportive)",
    style:
      "Encouraging, focuses on potential, asks about collaboration. Uses positive reinforcement.",
    tone: "Warm, professional, constructive.",
  },
  system: {
    name: "Sam",
    role: "System Architect",
    style:
      "Obsessed with scalability, databases, CAP theorem, Sharding, and Trade-offs.",
    tone: "Analytical, thoughtful, detail-oriented.",
  },
};

router.post("/", async (req: any, res: any) => {
  try {
    const {
      message,
      resumeId,
      history,
      mode = "strict",
      difficulty = "medium",
      language = "english", // ✅ Default to English if not provided
    } = req.body;

    if (!message || !resumeId)
      return res.status(400).json({ error: "Required fields missing" });

    let contextText = "";

    // --- STEP 1: CONTEXT RETRIEVAL ---
    try {
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
      } else {
        // Fallback to full resume if vector search fails or returns nothing relevant
        const r = await ResumeModel.findById(resumeId);
        if (r) contextText = r.content.substring(0, 8000);
      }
    } catch (err: any) {
      console.warn("⚠️ Vector Search failed, switching to fallback.");
      const r = await ResumeModel.findById(resumeId);
      if (r) contextText = r.content.substring(0, 8000);
    }

    // --- STEP 2: SELECT PERSONA ---
    const persona = PERSONAS[mode] || PERSONAS["strict"];

    // --- STEP 3: LANGUAGE INSTRUCTION BUILDER ---
    let languageInstruction = "";
    if (language === "hinglish") {
      languageInstruction = `
      - **Language Mode:** HINGLISH (Mix of Hindi & English).
      - **Rule:** Speak naturally like an Indian Tech Interviewer. Use English for technical terms (e.g., "Dependency Injection", "Scalability") but use Hindi for connecting verbs/grammar.
      - **Example:** "Tumhara approach thoda complex lag raha hai. Isse optimize kaise karoge?"
      - **Avoid:** Do not use pure Shuddh Hindi. Keep it casual professional.
      `;
    } else {
      languageInstruction = `
      - **Language Mode:** Professional English (US/Global Standard).
      - **Rule:** Use clear, concise, and professional grammar.
      `;
    }

    // --- STEP 4: SYSTEM PROMPT (The Brain) ---
    const systemPrompt = `
      You are '${persona.name}', a ${persona.role}.
      Your goal is to conduct a technical interview based on the candidate's resume.
      
      --- YOUR STYLE ---
      ${persona.style}
      Tone: ${persona.tone}
      Current Difficulty Level: ${difficulty}
      
      --- LANGUAGE INSTRUCTIONS (STRICTLY FOLLOW) ---
      ${languageInstruction}

      --- RESUME CONTEXT ---
      ${contextText}

      --- INTERVIEW GUIDELINES ---
      1. **Verify Facts:** If the candidate is wrong or vague, call them out immediately. Do not be polite if they are hallucinating concepts.
      2. **Concise Responses:** Keep your response under **2-3 sentences**. This is a voice conversation, long text is bad.
      3. **One Question at a Time:** Ask exactly ONE follow-up question. Do not stack multiple questions.
      4. **No Fluff:** Do not say "That's a great answer" unless it is perfect. If it's okay, just say "Okay" and move on.
      5. **Assessment Criteria (Internal Thought Process):**
         - Content Quality (Technical Accuracy)
         - Communication (Clarity)
         - Domain Knowledge (Depth)
      
      If the user just says "Hello" or "Start", introduce yourself briefly as ${persona.name} and ask the first question based on their Resume Projects/Skills.
    `;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    // Inject History
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
      max_tokens: 150, // Keep short for TTS speed
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
