import { logger } from "./logger";
import { notificationService } from "./notifications";
import axios from "axios";
import { AutomationModel, IAutomationAction } from "../models/Automation";
import { AutomationRunModel } from "../models/AutomationRun";

export async function getAutomations() {
  return AutomationModel.find().sort({ createdAt: -1 }).lean();
}

export async function getAutomation(id: string) {
  return AutomationModel.findOne({ id }).lean();
}

export async function createAutomation(data: Record<string, unknown>) {
  const automation = await AutomationModel.create({
    ...data,
    createdBy: (data.createdBy as string) || "system",
  });
  return automation.toObject();
}

export async function updateAutomation(id: string, updates: Record<string, unknown>) {
  return AutomationModel.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true }
  ).lean();
}

export async function deleteAutomation(id: string) {
  const result = await AutomationModel.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function runAutomation(automationId: string, triggerEvent: string, context: Record<string, unknown>) {
  const automation = await AutomationModel.findOne({ id: automationId }).lean();
  if (!automation) throw new Error(`Automation ${automationId} not found`);

  const run = await AutomationRunModel.create({
    automationId,
    triggerEvent,
    status: "running",
    startedAt: new Date(),
    results: [],
  });

  logger.info(`Running automation: ${automation.name}`);

  for (const action of (automation as any).actions as IAutomationAction[]) {
    const startTime = Date.now();
    try {
      const result = await executeAction(action, context);
      run.results.push({
        action: action.type,
        status: "completed",
        output: JSON.stringify(result),
        duration: Date.now() - startTime,
      });
    } catch (error) {
      run.results.push({
        action: action.type,
        status: "failed",
        error: String(error),
        duration: Date.now() - startTime,
      });
    }
  }

  const allSucceeded = run.results.every(r => r.status === "completed");
  run.status = allSucceeded ? "completed" : "failed";
  run.completedAt = new Date();
  await run.save();

  await AutomationModel.updateOne(
    { id: automationId },
    { $set: { lastRunAt: new Date() }, $inc: { runCount: 1 } }
  );

  return run.toObject();
}

async function executeAction(action: IAutomationAction, context: Record<string, unknown>): Promise<unknown> {
  const config = (action.config || {}) as Record<string, unknown>;

  switch (action.type) {
    case "custom": {
      if (config.actionType === "delay") {
        const delayMs = (config.minutes as number || 1) * 60000;
        await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 5000)));
        return { delayed: true, duration: delayMs };
      }
      return { actionCompleted: true };
    }

    case "email": {
      const template = String(config.template || "interview-reminder");
      const to = String(config.to || context.candidateEmail || "");
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

    case "notification": {
      const userId = String(context.userId || "system");
      const title = String(context.title || "InterviewMinds Notification");
      const message = String(context.message || "You have a new notification.");
      const channel = String(config.channel || "in-app") as any;
      const result = await notificationService.sendNotification(
        userId,
        String(config.type || "general"),
        channel,
        title,
        message,
        { to: context.candidateEmail, phone: context.candidatePhone, url: context.webhookUrl }
      );
      return { notificationSent: result.status === "sent", notificationId: result.id };
    }

    case "webhook": {
      const url = String(config.url || context.webhookUrl || "");
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

export async function getRuns(automationId?: string) {
  const filter = automationId ? { automationId } : {};
  return AutomationRunModel.find(filter).sort({ createdAt: -1 }).lean();
}

export async function getRun(runId: string) {
  return AutomationRunModel.findOne({ id: runId }).lean();
}

export async function findAutomationsByTrigger(event: string) {
  return AutomationModel.find({ isActive: true, trigger: event }).lean();
}

export async function triggerAutomations(event: string, context: Record<string, unknown>) {
  const matchingAutomations = await findAutomationsByTrigger(event);
  const results = [];

  for (const automation of matchingAutomations) {
    const run = await runAutomation(automation.id!, event, context);
    results.push(run);
  }

  logger.info(`Triggered ${results.length} automations for event: ${event}`);
  return results;
}

export async function testAutomation(automationId: string, testContext: Record<string, unknown>) {
  const automation = await AutomationModel.findOne({ id: automationId }).lean();
  if (!automation) throw new Error(`Automation ${automationId} not found`);

  logger.info(`Testing automation: ${automation.name}`);
  return runAutomation(automationId, "test", testContext);
}
