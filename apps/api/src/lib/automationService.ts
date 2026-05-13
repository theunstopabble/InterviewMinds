import { logger } from "./logger";
import { notificationService } from "./notifications";
import { InterviewModel } from "../models/Interview";
import axios from "axios";

export interface AutomationTrigger {
  id: string;
  event: string;
  conditions?: Record<string, unknown>;
}

export interface AutomationAction {
  id: string;
  type: "send_email" | "send_notification" | "update_status" | "webhook" | "delay" | "condition";
  config: Record<string, unknown>;
  condition?: Record<string, unknown>;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  createdAt: Date;
  lastRun?: Date;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  status: "pending" | "running" | "completed" | "failed";
  triggerEvent: string;
  context: Record<string, unknown>;
  results: Array<{ actionId: string; success: boolean; output?: unknown; error?: string }>;
  startedAt: Date;
  completedAt?: Date;
}

const automations: Automation[] = [
  {
    id: "auto_001",
    name: "Candidate Follow-up",
    description: "Send follow-up email after interview",
    enabled: true,
    triggers: [{ id: "t1", event: "interview.completed" }],
    actions: [
      { id: "a1", type: "delay", config: { minutes: 60 } },
      { id: "a2", type: "send_email", config: { template: "interview_followup", to: "candidate" } },
    ],
    createdAt: new Date(),
  },
  {
    id: "auto_002",
    name: "Interview Reminder",
    description: "Send reminder before interview",
    enabled: true,
    triggers: [{ id: "t2", event: "interview.scheduled" }],
    actions: [
      { id: "a3", type: "delay", config: { minutes: 30 }, condition: { minutesBefore: 30 } },
      { id: "a4", type: "send_notification", config: { type: "reminder" } },
    ],
    createdAt: new Date(),
  },
];

const runs: AutomationRun[] = [];

export function getAutomations(): Automation[] {
  return automations;
}

export function getAutomation(id: string): Automation | undefined {
  return automations.find(a => a.id === id);
}

export function createAutomation(automation: Omit<Automation, "id" | "createdAt">): Automation {
  const newAutomation: Automation = {
    ...automation,
    id: `auto_${Date.now()}`,
    createdAt: new Date(),
  };
  automations.push(newAutomation);
  logger.info(`Created automation: ${newAutomation.name}`);
  return newAutomation;
}

export function updateAutomation(id: string, updates: Partial<Automation>): Automation | null {
  const automation = automations.find(a => a.id === id);
  if (automation) {
    Object.assign(automation, updates);
    return automation;
  }
  return null;
}

export function deleteAutomation(id: string): boolean {
  const idx = automations.findIndex(a => a.id === id);
  if (idx !== -1) {
    automations.splice(idx, 1);
    return true;
  }
  return false;
}

export async function runAutomation(automationId: string, triggerEvent: string, context: Record<string, unknown>): Promise<AutomationRun> {
  const automation = automations.find(a => a.id === automationId);
  if (!automation) throw new Error(`Automation ${automationId} not found`);

  const run: AutomationRun = {
    id: `run_${Date.now()}`,
    automationId,
    status: "running",
    triggerEvent,
    context,
    results: [],
    startedAt: new Date(),
  };
  runs.push(run);

  logger.info(`Running automation: ${automation.name}`);

  for (const action of automation.actions) {
    try {
      const result = await executeAction(action, context);
      run.results.push({ actionId: action.id, success: true, output: result });
    } catch (error) {
      run.results.push({ actionId: action.id, success: false, error: String(error) });
    }
  }

  run.status = "completed";
  run.completedAt = new Date();
  automation.lastRun = new Date();

  return run;
}

/* ------------------------------------------------------------------ */
/*  REAL ACTION EXECUTION                                              */
/* ------------------------------------------------------------------ */

async function executeAction(action: AutomationAction, context: Record<string, unknown>): Promise<unknown> {
  switch (action.type) {
    case "delay": {
      const delayMs = (action.config.minutes as number || 1) * 60000;
      /* In production this should use BullMQ scheduled jobs; for now we simulate a short delay */
      await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 5000)));
      return { delayed: true, duration: delayMs };
    }

    case "send_email": {
      const template = String(action.config.template || "interview-reminder");
      const to = String(action.config.to || context.candidateEmail || "");
      const candidateName = String(context.candidateName || "Candidate");
      const result = await notificationService.sendTemplatedNotification(
        String(context.userId || "system"),
        template,
        {
          candidate_name: candidateName,
          interview_time: String(context.interviewTime || new Date().toISOString()),
          role: String(context.role || "Position"),
          interview_link: String(context.interviewLink || ""),
          email: to,
        }
      );
      return { emailSent: !!result, notificationId: result?.id };
    }

    case "send_notification": {
      const userId = String(context.userId || "system");
      const title = String(context.title || "InterviewMinds Notification");
      const message = String(context.message || "You have a new notification.");
      const channel = String(action.config.channel || "in-app") as any;
      const result = await notificationService.sendNotification(
        userId,
        String(action.config.type || "general"),
        channel,
        title,
        message,
        { to: context.candidateEmail, phone: context.candidatePhone, url: context.webhookUrl }
      );
      return { notificationSent: result.status === "sent", notificationId: result.id };
    }

    case "update_status": {
      const interviewId = String(context.interviewId || "");
      const newStatus = String(action.config.status || context.newStatus || "completed");
      if (interviewId) {
        await InterviewModel.findByIdAndUpdate(interviewId, { status: newStatus });
      }
      return { statusUpdated: true, interviewId, newStatus };
    }

    case "webhook": {
      const url = String(action.config.url || context.webhookUrl || "");
      if (!url) throw new Error("No webhook URL configured");
      const payload = {
        event: context.event,
        interviewId: context.interviewId,
        candidateId: context.candidateId,
        timestamp: new Date().toISOString(),
      };
      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });
      return { webhookCalled: true, statusCode: response.status };
    }

    default:
      return { actionCompleted: true };
  }
}

export function getRuns(automationId?: string): AutomationRun[] {
  if (automationId) {
    return runs.filter(r => r.automationId === automationId);
  }
  return runs;
}

export function getRun(runId: string): AutomationRun | undefined {
  return runs.find(r => r.id === runId);
}

export function findAutomationsByTrigger(event: string): Automation[] {
  return automations.filter(a => a.enabled && a.triggers.some(t => t.event === event));
}

export async function triggerAutomations(event: string, context: Record<string, unknown>): Promise<AutomationRun[]> {
  const matchingAutomations = findAutomationsByTrigger(event);
  const results: AutomationRun[] = [];

  for (const automation of matchingAutomations) {
    const run = await runAutomation(automation.id, event, context);
    results.push(run);
  }

  logger.info(`Triggered ${results.length} automations for event: ${event}`);
  return results;
}

export function testAutomation(automationId: string, testContext: Record<string, unknown>): Promise<AutomationRun> {
  const automation = automations.find(a => a.id === automationId);
  if (!automation) throw new Error(`Automation ${automationId} not found`);

  logger.info(`Testing automation: ${automation.name}`);
  return runAutomation(automationId, "test", testContext);
}