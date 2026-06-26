import Groq from "groq-sdk";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

export interface InterviewFeedbackRequest {
  candidateName: string;
  role: string;
  interviewDate: string;
  messages: { role: 'assistant' | 'user'; content: string; timestamp?: string }[];
  questions: { question: string; type: string; difficulty?: string }[];
  scores?: {
    technical?: number;
    communication?: number;
    problemSolving?: number;
    overall?: number;
  };
  interviewerPersona?: string;
  language?: string;
}

export interface InterviewFeedbackResult {
  summary: string;
  overallScore: number;
  categoryScores: {
    technicalSkills: number;
    communication: number;
    problemSolving: number;
    culturalFit: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  detailedAnalysis: {
    questionId: number;
    question: string;
    score: number;
    feedback: string;
    keyPoints: string[];
  }[];
  recommendations: {
    hiring: 'strong_yes' | 'yes' | 'maybe' | 'no';
    nextSteps: string[];
    suggestedRoles?: string[];
  };
  redFlags: string[];
  keyInsights: string[];
}

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey: key });
}

function buildPrompt(request: InterviewFeedbackRequest): string {
  const { candidateName, role, interviewDate, messages, questions, scores, interviewerPersona, language } = request;

  const transcript = messages
    .map((m) => `[${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}] ${m.content}`)
    .join("\n");

  const questionsList = questions
    .map((q, i) => `Q${i + 1}: [${q.type}]${q.difficulty ? ` (${q.difficulty})` : ''} ${q.question}`)
    .join("\n");

  const scoresText = scores
    ? `\nPre-computed Scores:\n${Object.entries(scores).map(([k, v]) => `- ${k}: ${v}/100`).join("\n")}`
    : "";

  const personaText = interviewerPersona ? `Interviewer Persona: ${interviewerPersona}` : "";
  const langText = language ? `Interview Language: ${language}` : "";

  return `You are an expert interview feedback analyst. Analyze the following interview session and generate comprehensive structured feedback.

Candidate: ${candidateName}
Role Applied: ${role}
Date: ${interviewDate}
${personaText}
${langText}${scoresText}

Questions Asked:
${questionsList}

Interview Transcript:
${transcript}

Generate a detailed feedback report in the following JSON format (return ONLY valid JSON, no markdown wrapping):
{
  "summary": "2-3 sentence overall assessment of the candidate's performance",
  "overallScore": <number between 0-100>,
  "categoryScores": {
    "technicalSkills": <0-100>,
    "communication": <0-100>,
    "problemSolving": <0-100>,
    "culturalFit": <0-100>
  },
  "strengths": ["strength1", "strength2", ...],
  "areasForImprovement": ["area1", "area2", ...],
  "detailedAnalysis": [
    {
      "questionId": <question number 1-based>,
      "question": "the question text",
      "score": <0-100>,
      "feedback": "detailed feedback on the answer",
      "keyPoints": ["point1", "point2", ...]
    }
  ],
  "recommendations": {
    "hiring": "strong_yes" | "yes" | "maybe" | "no",
    "nextSteps": ["step1", "step2", ...],
    "suggestedRoles": ["role1", ...]
  },
  "redFlags": ["red flag 1", ...],
  "keyInsights": ["insight1", "insight2", ...]
}

Guidelines for analysis:
- Score each question-answer pair individually based on correctness, depth, and clarity
- Evaluate communication skills (clarity, structure, confidence)
- Assess technical depth (accuracy, specificity, depth of knowledge)
- Evaluate problem-solving approach (methodology, reasoning, alternatives considered)
- For behavioral questions, assess STAR method usage, relevance, and impact
- Detect red flags: vague answers, lack of knowledge, poor communication, inconsistencies, defensiveness
- Consider the interviewer persona's perspective in evaluation
- If language is Hinglish, evaluate communication naturally - mixing Hindi/English is normal
- Provide actionable hiring recommendations based on overall performance
- Be objective and constructive; highlight both positives and areas for growth`;
}

function parseFeedbackResponse(content: string): InterviewFeedbackResult {
  const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in response");
  }
  return JSON.parse(jsonMatch[0]) as InterviewFeedbackResult;
}

export async function generateFeedback(request: InterviewFeedbackRequest): Promise<InterviewFeedbackResult> {
  const groq = getGroqClient();
  const prompt = buildPrompt(request);

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are an expert interview feedback analyst. Always respond with valid JSON only, no markdown formatting." },
      { role: "user", content: prompt },
    ] as any,
    temperature: 0.3,
    max_tokens: 4096,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from Groq");
  }

  try {
    return parseFeedbackResponse(content);
  } catch (parseError) {
    logger.error({ err: parseError, contentLength: content.length }, "Failed to parse feedback JSON");
    throw new Error("Failed to parse feedback response");
  }
}
