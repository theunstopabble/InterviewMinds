import { logger } from "./logger";
import Groq from "groq-sdk";

export interface AgentConfig {
  name: string;
  type: "screening" | "scheduling" | "feedback" | "followup" | "custom";
  enabled: boolean;
  triggers: string[];
  actions: string[];
  schedule?: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ResumeScreeningResult {
  candidateId: string;
  score: number;
  recommendation: "strong_yes" | "yes" | "neutral" | "no" | "strong_no";
  strengths: string[];
  weaknesses: string[];
  interviewRounds: number;
  rationale: string;
}

export interface SchedulingResult {
  candidateId: string;
  interviewerId: string;
  scheduledAt: Date;
  duration: number;
  meetingLink: string;
  confirmationSent: boolean;
}

export interface FeedbackResult {
  interviewId: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  culturalFit: number;
  strengths: string[];
  areasForImprovement: string[];
  recommendation: string;
  detailedFeedback: string;
}

const agents: AgentConfig[] = [
  {
    name: "Resume Screening Agent",
    type: "screening",
    enabled: true,
    triggers: ["resume.uploaded", "candidate.applied"],
    actions: ["score.resume", "shortlist.candidate", "notify.hr"],
  },
  {
    name: "Scheduling Agent",
    type: "scheduling",
    enabled: true,
    triggers: ["candidate.shortlisted", "interview.approved"],
    actions: ["find.slot", "send.invite", "create.meeting"],
  },
  {
    name: "Feedback Agent",
    type: "feedback",
    enabled: true,
    triggers: ["interview.completed"],
    actions: ["analyze.responses", "generate.feedback", "notify.candidate"],
  },
];

const tasks: AgentTask[] = [];

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  return new Groq({ apiKey: key });
}

export function getAgents(): AgentConfig[] {
  return agents;
}

export function getAgent(name: string): AgentConfig | undefined {
  return agents.find(a => a.name === name);
}

export function updateAgent(name: string, updates: Partial<AgentConfig>): AgentConfig | null {
  const agent = agents.find(a => a.name === name);
  if (agent) {
    Object.assign(agent, updates);
    return agent;
  }
  return null;
}

export async function runAgent(agentName: string, input: Record<string, unknown>): Promise<AgentTask> {
  const agent = agents.find(a => a.name === agentName);
  if (!agent) throw new Error(`Agent ${agentName} not found`);

  const task: AgentTask = {
    id: `task_${Date.now()}`,
    agentId: agentName,
    status: "running",
    input,
    startedAt: new Date(),
  };
  tasks.push(task);

  logger.info(`Running agent: ${agentName}`);

  try {
    switch (agent.type) {
      case "screening":
        task.output = await runScreeningAgent(input) as unknown as Record<string, unknown>;
        break;
      case "scheduling":
        task.output = await runSchedulingAgent(input) as unknown as Record<string, unknown>;
        break;
      case "feedback":
        task.output = await runFeedbackAgent(input) as unknown as Record<string, unknown>;
        break;
      default:
        task.output = { result: "completed" };
    }
    task.status = "completed";
  } catch (err: any) {
    task.status = "failed";
    task.error = err.message;
    logger.error({ err: err.message, agentName }, "Agent execution failed");
  }

  task.completedAt = new Date();
  return task;
}

/* ------------------------------------------------------------------ */
/*  REAL AI AGENTS — Groq-powered                                      */
/* ------------------------------------------------------------------ */

async function runScreeningAgent(input: Record<string, unknown>): Promise<ResumeScreeningResult> {
  const candidateId = String(input.candidateId || "cand_001");
  const resumeText = String(input.resumeText || "");
  const jobRole = String(input.jobRole || "Software Engineer");

  if (!resumeText) {
    return {
      candidateId,
      score: 0,
      recommendation: "neutral",
      strengths: [],
      weaknesses: ["No resume text provided"],
      interviewRounds: 0,
      rationale: "Insufficient data to screen candidate",
    };
  }

  const groq = getGroqClient();
  const prompt = `You are an expert technical recruiter. Evaluate this resume for the role of ${jobRole}.

Resume:
${resumeText.slice(0, 4000)}

Return ONLY a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "recommendation": "strong_yes" | "yes" | "neutral" | "no" | "strong_no",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "interviewRounds": <number>,
  "rationale": "..."
}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    candidateId,
    score: Math.min(100, Math.max(0, parsed.score || 50)),
    recommendation: parsed.recommendation || "neutral",
    strengths: parsed.strengths || ["Resume screened via AI"],
    weaknesses: parsed.weaknesses || [],
    interviewRounds: parsed.interviewRounds || 2,
    rationale: parsed.rationale || "AI screening completed",
  };
}

async function runSchedulingAgent(input: Record<string, unknown>): Promise<SchedulingResult> {
  const candidateId = String(input.candidateId || "cand_001");
  const interviewerId = String(input.interviewerId || "interviewer_001");
  const preferredDate = String(input.preferredDate || "");

  /* Use Groq to suggest an optimal time based on context */
  const groq = getGroqClient();
  const prompt = `Suggest an interview schedule. Candidate: ${candidateId}. Interviewer: ${interviewerId}. Preferred: ${preferredDate || "ASAP"}.
Return ONLY JSON: {"duration": 60, "meetingLink": "https://interviewminds.com/meeting/...", "daysFromNow": 2}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 256,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const daysFromNow = parsed.daysFromNow || 2;
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + daysFromNow);

  return {
    candidateId,
    interviewerId,
    scheduledAt,
    duration: parsed.duration || 60,
    meetingLink: parsed.meetingLink || `https://interviewminds.com/meeting/${Date.now()}`,
    confirmationSent: false,
  };
}

async function runFeedbackAgent(input: Record<string, unknown>): Promise<FeedbackResult> {
  const interviewId = String(input.interviewId || "int_001");
  const transcript = String(input.transcript || "");
  const metrics = input.metrics as Array<{ subject: string; A: number }> || [];

  if (!transcript && metrics.length === 0) {
    return {
      interviewId,
      overallScore: 0,
      technicalScore: 0,
      communicationScore: 0,
      culturalFit: 0,
      strengths: [],
      areasForImprovement: ["No interview data available"],
      recommendation: "Requires manual review",
      detailedFeedback: "Insufficient data to generate feedback.",
    };
  }

  const groq = getGroqClient();
  const prompt = `You are a senior engineering manager giving candidate interview feedback.

Interview Transcript:
${transcript.slice(0, 3000)}

Metrics:
${metrics.map(m => `${m.subject}: ${m.A}/100`).join("\n")}

Return ONLY a JSON object with this exact structure:
{
  "overallScore": <number>,
  "technicalScore": <number>,
  "communicationScore": <number>,
  "culturalFit": <number>,
  "strengths": ["..."],
  "areasForImprovement": ["..."],
  "recommendation": "...",
  "detailedFeedback": "..."
}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  return {
    interviewId,
    overallScore: Math.min(100, Math.max(0, parsed.overallScore || 70)),
    technicalScore: Math.min(100, Math.max(0, parsed.technicalScore || 70)),
    communicationScore: Math.min(100, Math.max(0, parsed.communicationScore || 70)),
    culturalFit: Math.min(100, Math.max(0, parsed.culturalFit || 70)),
    strengths: parsed.strengths || ["Good participation"],
    areasForImprovement: parsed.areasForImprovement || ["Further practice recommended"],
    recommendation: parsed.recommendation || "Proceed to next round",
    detailedFeedback: parsed.detailedFeedback || "Feedback generated by AI.",
  };
}

export function getTasks(agentId?: string): AgentTask[] {
  if (agentId) {
    return tasks.filter(t => t.agentId === agentId);
  }
  return tasks;
}

export function getTask(taskId: string): AgentTask | undefined {
  return tasks.find(t => t.id === taskId);
}

export function createAgent(config: Omit<AgentConfig, "enabled">): AgentConfig {
  const newAgent: AgentConfig = {
    ...config,
    enabled: true,
  };
  agents.push(newAgent);
  logger.info(`Created agent: ${newAgent.name}`);
  return newAgent;
}

export function deleteAgent(name: string): boolean {
  const idx = agents.findIndex(a => a.name === name);
  if (idx !== -1) {
    agents.splice(idx, 1);
    return true;
  }
  return false;
}