import Groq from "groq-sdk";
import dotenv from "dotenv";
import { logger } from "./logger";
import { ConversationMemoryModel } from "../models/ConversationMemory";

dotenv.config();

export interface ConversationMemory {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
  }>;
  context: {
    resumeEntities?: {
      skills: string[];
      experience: string[];
      education: string[];
    };
    jobRole?: string;
    difficulty?: string;
    competencies?: string[];
  };
  metrics: {
    totalQuestions: number;
    correctAnswers: number;
    topicCoverage: string[];
    startTime: number;
  };
}

export interface InterviewConfig {
  jobRole: string;
  experienceLevel: string;
  requiredSkills: string[];
  competencies: string[];
  difficulty: "entry" | "mid" | "senior" | "lead";
  persona: "strict" | "friendly" | "balanced";
}

const PERSONA_PROMPTS = {
  strict: "You are a Senior Staff Engineer. Be direct, technical, and skeptical. Drill deep into implementation details. No surface-level answers accepted.",
  friendly: "You are an Engineering Manager. Be supportive, encouraging, and conversational. Help the candidate feel comfortable while assessing their skills.",
  balanced: "You are a Technical Lead. Mix technical rigor with supportive questioning. Assess both hard skills and soft skills.",
};

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  return new Groq({ apiKey: key });
}

const MAX_MEMORY_LENGTH = 20;

export class LLMInterviewer {
  private sessionId: string;
  private config: InterviewConfig;

  constructor(sessionId: string, config: InterviewConfig) {
    this.sessionId = sessionId;
    this.config = config;
  }

  async addUserMessage(content: string): Promise<void> {
    await ConversationMemoryModel.findOneAndUpdate(
      { sessionId: this.sessionId },
      {
        $push: {
          messages: { role: "user", content, timestamp: new Date() },
        },
      }
    );
  }

  async addAssistantMessage(content: string): Promise<void> {
    await ConversationMemoryModel.findOneAndUpdate(
      { sessionId: this.sessionId },
      {
        $push: {
          messages: { role: "assistant", content, timestamp: new Date() },
        },
      }
    );
    await this.trimMemory();
  }

  async setResumeEntities(entities: {
    skills: string[];
    experience: string[];
    education: string[];
  }): Promise<void> {
    const doc = await ConversationMemoryModel.findOne({ sessionId: this.sessionId });
    if (doc) {
      const config = { ...(doc.config || {}), resumeEntities: entities };
      await ConversationMemoryModel.findOneAndUpdate(
        { sessionId: this.sessionId },
        { config }
      );
    }
  }

  private async trimMemory(): Promise<void> {
    const doc = await ConversationMemoryModel.findOne({ sessionId: this.sessionId });
    if (doc && doc.messages.length > MAX_MEMORY_LENGTH) {
      const systemMsgs = doc.messages.filter(m => m.role === "system");
      const trimmed = [
        ...systemMsgs,
        ...doc.messages.slice(-MAX_MEMORY_LENGTH),
      ];
      await ConversationMemoryModel.findOneAndUpdate(
        { sessionId: this.sessionId },
        { messages: trimmed }
      );
    }
  }

  async buildSystemPrompt(): Promise<string> {
    const doc = await ConversationMemoryModel.findOne({ sessionId: this.sessionId });
    if (!doc) throw new Error(`Session ${this.sessionId} not found`);

    const c = (doc.config || {}) as any;
    const personaPrompt = PERSONA_PROMPTS[this.config.persona];
    const skillsPrompt = c.resumeEntities?.skills?.length
      ? `Candidate skills: ${c.resumeEntities.skills.join(", ")}`
      : "";

    const totalQuestions = doc.messages.filter(m => m.role === "assistant").length;
    const startTime = doc.createdAt?.getTime() || Date.now();

    return `${personaPrompt}

Job Role: ${this.config.jobRole}
Experience Level: ${this.config.experienceLevel}
Required Skills: ${this.config.requiredSkills.join(", ")}
Difficulty: ${this.config.difficulty}
${skillsPrompt}

Interview Duration: ${Math.floor((Date.now() - startTime) / 60000)} minutes
Questions Asked: ${totalQuestions}
Topics Covered: ${c.topicCoverage?.join(", ") || "None yet"}

Provide a realistic interview experience. Ask follow-up questions based on candidate responses.`;
  }

  async generateResponse(userInput: string): Promise<string> {
    await this.addUserMessage(userInput);

    const groq = getGroqClient();
    const systemPrompt = await this.buildSystemPrompt();
    const doc = await ConversationMemoryModel.findOne({ sessionId: this.sessionId });
    if (!doc) throw new Error(`Session ${this.sessionId} not found`);

    const recentMessages = doc.messages.slice(-10).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages,
      ] as any,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    await this.addAssistantMessage(response);

    return response;
  }

  async generateFollowUp(lastAnswer: string, topic?: string): Promise<string> {
    const groq = getGroqClient();

    const prompt = `Based on this answer: "${lastAnswer}"
${topic ? `Focus on: ${topic}` : ""}

Generate one deep follow-up question that probes deeper into the candidate's understanding.
Make it specific to their answer - don't ask generic questions.
Return ONLY the question, nothing else.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 256,
    });

    return completion.choices[0]?.message?.content || "Can you elaborate more on that?";
  }

  async getMemory(): Promise<ConversationMemory> {
    const doc = await ConversationMemoryModel.findOne({ sessionId: this.sessionId });
    if (!doc) throw new Error(`Session ${this.sessionId} not found`);

    const c = (doc.config || {}) as any;
    const totalQuestions = doc.messages.filter(m => m.role === "assistant").length;
    const startTime = doc.createdAt?.getTime() || Date.now();

    return {
      messages: doc.messages.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        timestamp: m.timestamp?.getTime?.() || Date.now(),
      })),
      context: {
        resumeEntities: c.resumeEntities,
        jobRole: this.config.jobRole,
        difficulty: this.config.difficulty,
        competencies: this.config.competencies,
      },
      metrics: {
        totalQuestions,
        correctAnswers: 0,
        topicCoverage: c.topicCoverage || [],
        startTime,
      },
    };
  }

  async getMetrics(): Promise<{
    totalQuestions: number;
    correctAnswers: number;
    topicCoverage: string[];
    startTime: number;
    duration: number;
    messageCount: number;
  }> {
    const doc = await ConversationMemoryModel.findOne({ sessionId: this.sessionId });
    if (!doc) throw new Error(`Session ${this.sessionId} not found`);

    const c = (doc.config || {}) as any;
    const totalQuestions = doc.messages.filter(m => m.role === "assistant").length;
    const startTime = doc.createdAt?.getTime() || Date.now();

    return {
      totalQuestions,
      correctAnswers: 0,
      topicCoverage: c.topicCoverage || [],
      startTime,
      duration: Date.now() - startTime,
      messageCount: doc.messages.length,
    };
  }
}

export async function createLLMInterviewer(sessionId: string, config: InterviewConfig): Promise<LLMInterviewer> {
  await ConversationMemoryModel.create({
    sessionId,
    interviewId: sessionId,
    messages: [],
    config: {
      jobRole: config.jobRole,
      experienceLevel: config.experienceLevel,
      requiredSkills: config.requiredSkills,
      competencies: config.competencies,
      difficulty: config.difficulty,
      persona: config.persona,
      topicCoverage: [],
    },
  });
  return new LLMInterviewer(sessionId, config);
}

export async function generateInterviewSummary(
  memory: ConversationMemory,
  finalScore: number
): Promise<string> {
  const groq = getGroqClient();

  const prompt = `Generate a professional interview summary with these details:

Role: ${memory.context.jobRole}
Difficulty: ${memory.context.difficulty}
Duration: ${Math.floor((Date.now() - memory.metrics.startTime) / 60000)} minutes
Questions Asked: ${memory.metrics.totalQuestions}
Final Score: ${finalScore}/100

Conversation Summary:
${memory.messages.slice(-10).map(m => `${m.role}: ${m.content.slice(0, 100)}...`).join("\n")}

Generate a structured summary with:
1. Overall Performance
2. Technical Skills Assessed
3. Strengths Identified
4. Areas for Improvement
5. Recommendation`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content || "Summary generation failed";
}

export async function generateCandidateFeedback(
  memory: ConversationMemory,
  score: number
): Promise<{
  strengths: string[];
  improvements: string[];
  tips: string[];
  overallFeedback: string;
}> {
  const groq = getGroqClient();

  const prompt = `Based on this interview, provide personalized feedback:

Score: ${score}/100
Job Role: ${memory.context.jobRole}
Total Questions: ${memory.metrics.totalQuestions}

Generate feedback in this JSON format:
{
  "strengths": ["2-3 key strengths"],
  "improvements": ["2-3 areas to improve"],
  "tips": ["3-4 actionable tips for next interview"],
  "overallFeedback": "2-3 sentence overall summary"
}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 512,
  });

  try {
    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to parse feedback JSON:");
  }

  return {
    strengths: ["Technical knowledge", "Problem-solving approach"],
    improvements: ["Communication skills", "System design depth"],
    tips: ["Practice explaining complex concepts", "Study system design patterns"],
    overallFeedback: "Good overall performance with room for improvement in specific areas.",
  };
}

export async function explainCodeInPlainEnglish(
  code: string,
  language: string
): Promise<string> {
  const groq = getGroqClient();

  const prompt = `Explain this ${language} code in simple, plain English that a non-technical person could understand:

\`\`\`${language}
${code}
\`\`\`

Focus on:
1. What does this code do? (simple terms)
2. How would you use it in real life?
3. What problem does it solve?

Keep it concise and conversational.`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 512,
  });

  return completion.choices[0]?.message?.content || "Could not generate explanation";
}
