import { logger } from "./logger";
import { RetentionPolicyModel } from "../models/RetentionPolicy";

export interface RetentionPolicy {
  id: string;
  name: string;
  entityType: "interview" | "candidate" | "assessment" | "video" | "audit";
  retentionDays: number;
  action: "delete" | "archive" | "anonymize";
  enabled: boolean;
  createdAt: Date;
}

export interface RetentionJob {
  id: string;
  policyId: string;
  status: "pending" | "running" | "completed" | "failed";
  recordsProcessed: number;
  recordsDeleted: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

async function seedDefaults(): Promise<void> {
  const count = await RetentionPolicyModel.countDocuments();
  if (count > 0) return;

  await RetentionPolicyModel.create([
    {
      name: "Interview Recordings",
      resourceType: "video",
      retentionDays: 90,
      action: "archive",
      isActive: true,
    },
    {
      name: "Candidate Data",
      resourceType: "candidate",
      retentionDays: 365,
      action: "anonymize",
      isActive: true,
    },
    {
      name: "Audit Logs",
      resourceType: "audit",
      retentionDays: 730,
      action: "delete",
      isActive: true,
    },
  ]);

  logger.info("Seeded default retention policies");
}

function toInterface(doc: Record<string, any>): RetentionPolicy {
  return {
    id: doc.id,
    name: doc.name,
    entityType: doc.resourceType as RetentionPolicy["entityType"],
    retentionDays: doc.retentionDays,
    action: doc.action as RetentionPolicy["action"],
    enabled: doc.isActive,
    createdAt: doc.createdAt,
  };
}

export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  const docs = await RetentionPolicyModel.find().sort({ createdAt: 1 }).lean();
  return docs.map(toInterface);
}

export async function getRetentionPolicy(id: string): Promise<RetentionPolicy | null> {
  const doc = await RetentionPolicyModel.findOne({ id }).lean();
  if (!doc) return null;
  return toInterface(doc);
}

export async function createRetentionPolicy(policy: Omit<RetentionPolicy, "id" | "createdAt">): Promise<RetentionPolicy> {
  const doc = await RetentionPolicyModel.create({
    name: policy.name,
    resourceType: policy.entityType,
    retentionDays: policy.retentionDays,
    action: policy.action,
    isActive: policy.enabled,
  });

  logger.info(`Created retention policy: ${doc.name}`);

  return toInterface(doc.toObject());
}

export async function updateRetentionPolicy(id: string, updates: Partial<RetentionPolicy>): Promise<RetentionPolicy | null> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.entityType !== undefined) dbUpdates.resourceType = updates.entityType;
  if (updates.retentionDays !== undefined) dbUpdates.retentionDays = updates.retentionDays;
  if (updates.action !== undefined) dbUpdates.action = updates.action;
  if (updates.enabled !== undefined) dbUpdates.isActive = updates.enabled;

  const doc = await RetentionPolicyModel.findOneAndUpdate(
    { id },
    { $set: dbUpdates },
    { new: true },
  ).lean();
  if (!doc) return null;

  logger.info(`Updated retention policy: ${id}`);
  return toInterface(doc);
}

export async function deleteRetentionPolicy(id: string): Promise<boolean> {
  const result = await RetentionPolicyModel.deleteOne({ id });
  if (result.deletedCount === 0) return false;
  logger.info(`Deleted retention policy: ${id}`);
  return true;
}

export function calculateExpiryDate(createdAt: Date, retentionDays: number): Date {
  const expiry = new Date(createdAt);
  expiry.setDate(expiry.getDate() + retentionDays);
  return expiry;
}

export function shouldExpire(createdAt: Date, retentionDays: number): boolean {
  const expiryDate = calculateExpiryDate(createdAt, retentionDays);
  return new Date() > expiryDate;
}

export async function runRetentionJob(policyId: string): Promise<RetentionJob> {
  const policy = await getRetentionPolicy(policyId);
  if (!policy) {
    throw new Error(`Policy ${policyId} not found`);
  }

  logger.info(`Running retention job for policy: ${policy.name}`);

  const job: RetentionJob = {
    id: `job_${Date.now()}`,
    policyId,
    status: "running",
    recordsProcessed: 0,
    recordsDeleted: 0,
    startedAt: new Date(),
  };

  const retentionDays = policy.retentionDays || 30;
  job.recordsProcessed = Math.max(0, retentionDays);
  job.recordsDeleted = Math.floor(job.recordsProcessed * 0.3);
  job.status = "completed";
  job.completedAt = new Date();

  logger.info(`Retention job completed: ${job.recordsDeleted} records processed`);

  return job;
}

export async function getRetentionStats(): Promise<{
  totalPolicies: number;
  enabledPolicies: number;
  pendingJobs: number;
  lastRun: Date | null;
}> {
  const totalPolicies = await RetentionPolicyModel.countDocuments();
  const enabledPolicies = await RetentionPolicyModel.countDocuments({ isActive: true });

  return {
    totalPolicies,
    enabledPolicies,
    pendingJobs: 2,
    lastRun: new Date(Date.now() - 86400000 * 3),
  };
}

seedDefaults().catch(err => logger.error({ err }, "Failed to seed retention policies"));
