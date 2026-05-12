import { logger } from "./logger";

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
  task.completedAt = new Date();

  return task;
}

async function runScreeningAgent(input: Record<string, unknown>): Promise<ResumeScreeningResult> {
  logger.info("Running resume screening agent");
  
  return {
    candidateId: String(input.candidateId || "cand_001"),
    score: Math.floor(Math.random() * 30) + 70,
    recommendation: "yes",
    strengths: ["Strong technical background", "Good communication"],
    weaknesses: ["Limited leadership experience"],
    interviewRounds: 2,
    rationale: "Candidate has required skills and experience",
  };
}

async function runSchedulingAgent(input: Record<string, unknown>): Promise<SchedulingResult> {
  logger.info("Running scheduling agent");
  
  return {
    candidateId: String(input.candidateId || "cand_001"),
    interviewerId: "interviewer_001",
    scheduledAt: new Date(Date.now() + 86400000 * 2),
    duration: 60,
    meetingLink: `https://interviewminds.com/meeting/${Date.now()}`,
    confirmationSent: true,
  };
}

async function runFeedbackAgent(input: Record<string, unknown>): Promise<FeedbackResult> {
  logger.info("Running feedback agent");
  
  return {
    interviewId: String(input.interviewId || "int_001"),
    overallScore: Math.floor(Math.random() * 20) + 75,
    technicalScore: Math.floor(Math.random() * 20) + 75,
    communicationScore: Math.floor(Math.random() * 20) + 80,
    culturalFit: Math.floor(Math.random() * 20) + 70,
    strengths: ["Strong problem-solving", "Good communication"],
    areasForImprovement: ["System design knowledge"],
    recommendation: "Proceed to next round",
    detailedFeedback: "Candidate demonstrated strong technical skills...",
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