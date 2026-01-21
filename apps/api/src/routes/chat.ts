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
      "Direct, skeptical. Focuses on efficient code, time complexity, and edge cases.",
    tone: "Professional, demanding.",
  },
  friendly: {
    name: "Neha",
    role: "Engineering Manager (Supportive)",
    style:
      "Encouraging. Focuses on code readability, logic building, and collaboration.",
    tone: "Warm, constructive.",
  },
  system: {
    name: "Sam",
    role: "System Architect",
    style:
      "Obsessed with scalability, API design, database structures, and clean code.",
    tone: "Analytical, thoughtful.",
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
      language = "english",
    } = req.body;

    if (!message || !resumeId)
      return res.status(400).json({ error: "Required fields missing" });

    let contextText = "";

    // --- STEP 1: CONTEXT RETRIEVAL (Vector Search) ---
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
        // Fallback to full resume if vector search fails
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
      - **Rule:** Speak naturally like an Indian Tech Interviewer. Use English for technical terms (e.g., "Function", "Array", "Compile") but use Hindi for connecting verbs.
      - **Example:** "Is problem ke liye ek function likho jo array ko sort kare aur run karke dikhao."
      - **Avoid:** Do not use pure Shuddh Hindi. Keep it casual professional.
      `;
    } else {
      languageInstruction = `
      - **Language Mode:** Professional English (US/Global Standard).
      - **Rule:** Use clear, concise, and professional grammar.
      `;
    }

    // --- STEP 4: SYSTEM PROMPT (The Brain - Updated for Coding) ---
    const systemPrompt = `
      You are '${persona.name}', a ${persona.role}.
      Your goal is to conduct a **Hands-on Technical Interview**.

      --- INTERVIEW ENVIRONMENT ---
      **IMPORTANT:** The candidate has a live **Code Editor** and **Compiler** on their screen.
      **DO NOT just ask theoretical questions.** You MUST verify their coding skills.

      --- YOUR STYLE ---
      ${persona.style}
      Tone: ${persona.tone}
      Difficulty: ${difficulty}

      --- LANGUAGE INSTRUCTIONS (STRICTLY FOLLOW) ---
      ${languageInstruction}

      --- RESUME CONTEXT ---
      ${contextText}

      --- INTERVIEW GUIDELINES ---
      1. **Mix Theory & Practice:** Start with 1-2 questions about their projects/resume to break the ice.
      2. **THE CODING CHALLENGE (CRITICAL):** After the intro, explicitly ask them to **Write Code** in the editor.
         - Example: "Okay, let's test your logic. Please write a function in the editor to reverse a string without using built-in methods, and run it."
         - Example: "Open the editor and create a simple API endpoint logic..."
      3. **Verify Execution:** Ask them: "Did the code run successfully? What was the output?"
      4. **Verify Facts:** If the candidate is wrong or vague, call them out immediately.
      5. **Short Responses:** Keep your speaking output under **3 sentences**. Long monologues are bad for voice chat.
      
      If the user says "Hello" or "Start", introduce yourself briefly as ${persona.name} and ask the first question based on their Resume Projects/Skills.
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
