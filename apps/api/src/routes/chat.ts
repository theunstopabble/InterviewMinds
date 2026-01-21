import express from "express";
import { ResumeModel } from "../models/Resume";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ 1. SETUP GROQ (Using Llama 3 70B for Deep Analysis)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 🎭 PERSONA DEFINITIONS
const PERSONAS: any = {
  strict: {
    name: "Vikram",
    role: "Senior Staff Engineer (Strict & Technical)",
    style:
      "Direct, skeptical. Drills down into specific implementation details of projects. Hates surface-level answers.",
    tone: "Professional, demanding, no-nonsense.",
  },
  friendly: {
    name: "Neha",
    role: "Engineering Manager (Supportive)",
    style:
      "Curious about problem-solving approaches in your projects. Focuses on 'How' and 'Why'.",
    tone: "Warm, constructive, engaging.",
  },
  system: {
    name: "Sam",
    role: "System Architect",
    style:
      "Focuses on the architecture of your projects. Asks about database choices, scalability, and trade-offs.",
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
      language = "english",
    } = req.body;

    if (!message || !resumeId)
      return res.status(400).json({ error: "Required fields missing" });

    // --- STEP 1: LOAD FULL RESUME CONTEXT (No Vector Search) ---
    // Why? Resumes are small enough for Llama 3's context window.
    // Sending the full text ensures the AI knows EVERYTHING (Projects, Skills, Experience).
    let contextText = "";
    try {
      const r = await ResumeModel.findById(resumeId);
      if (r && r.content) {
        // Limit to ~15,000 chars to be safe, but usually resumes are much smaller.
        contextText = r.content.substring(0, 15000);
      } else {
        throw new Error("Resume content not found");
      }
    } catch (err: any) {
      console.error("❌ Resume Fetch Error:", err.message);
      return res.status(404).json({ error: "Resume not found" });
    }

    // --- STEP 2: SELECT PERSONA ---
    const persona = PERSONAS[mode] || PERSONAS["strict"];

    // --- STEP 3: LANGUAGE INSTRUCTION BUILDER ---
    let languageInstruction = "";
    if (language === "hinglish") {
      languageInstruction = `
      - **Language Mode:** HINGLISH (Mix of Hindi & English).
      - **Rule:** Speak naturally like an Indian Tech Interviewer. Use English for technical terms (e.g., "Dependency Injection", "Scalability", "Latency") but use Hindi for connecting verbs/grammar.
      - **Example:** "Tumne jo 'SwadKart' project banaya hai, usme Redux kyu use kiya Context API ke jagah?"
      - **Avoid:** Do not use pure Shuddh Hindi. Keep it casual professional.
      `;
    } else {
      languageInstruction = `
      - **Language Mode:** Professional English.
      - **Rule:** Use clear, concise, and professional grammar.
      `;
    }

    // --- STEP 4: SYSTEM PROMPT (PROFESSIONAL TRAINING 🧠) ---
    const systemPrompt = `
      You are '${persona.name}', a ${persona.role}.
      You are conducting a high-stakes technical interview.

      --- 🧠 DEEP RESUME ANALYSIS MODE ---
      **CONTEXT:** You have the candidate's FULL resume below.
      **GOAL:** Do NOT ask generic questions (e.g., "Tell me about yourself"). Instead, pick a SPECIFIC project or skill from the resume and drill down immediately.

      --- RESUME CONTEXT ---
      ${contextText}

      --- INTERVIEW ENVIRONMENT ---
      **IMPORTANT:** The candidate has a live **Code Editor** & **Compiler**.
      **TASK:** You MUST test their coding skills.

      --- YOUR BEHAVIOR & RULES ---
      1. **Cite Specifics:** When asking a question, reference the resume explicitly.
         - ❌ Bad: "How do you handle state management?"
         - ✅ Good: "I see you used **Redux Toolkit** in your **SwadKart** project. Why did you choose that over Context API for this specific use case?"
      
      2. **The Coding Challenge (MANDATORY):**
         - After 1-2 initial theory questions, you MUST ask them to write code.
         - Say: "Okay, let's see how you implement this. Open the editor and write a function to..."
         - Ask them to **Run the code** and explain the output.

      3. **Strictness:**
         - If they give a vague answer, cut them off: "That's too generic. Give me a concrete example."
         - If they are wrong, correct them immediately.

      4. **Response Format:**
         - Keep it **short (2-3 sentences max)**. This is a voice conversation.
         - Current Difficulty: ${difficulty}
      
      --- LANGUAGE ---
      ${languageInstruction}

      If the user says "Hello" or "Start", introduce yourself as ${persona.name}, mention a specific project you found interesting in their resume, and ask a deep technical question about it immediately.
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
      model: "llama-3.3-70b-versatile", // Using the smartest model for deep reasoning
      temperature: 0.5, // Slightly lower temp for more focused/professional answers
      max_tokens: 200,
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
