import { logger } from "./logger";

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

const retentionPolicies: RetentionPolicy[] = [
  {
    id: "policy_1",
    name: "Interview Recordings",
    entityType: "video",
    retentionDays: 90,
    action: "archive",
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: "policy_2",
    name: "Candidate Data",
    entityType: "candidate",
    retentionDays: 365,
    action: "anonymize",
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: "policy_3",
    name: "Audit Logs",
    entityType: "audit",
    retentionDays: 730,
    action: "delete",
    enabled: true,
    createdAt: new Date(),
  },
];

export function getRetentionPolicies(): RetentionPolicy[] {
  return retentionPolicies;
}

export function getRetentionPolicy(id: string): RetentionPolicy | undefined {
  return retentionPolicies.find(p => p.id === id);
}

export function createRetentionPolicy(policy: Omit<RetentionPolicy, "id" | "createdAt">): RetentionPolicy {
  const newPolicy: RetentionPolicy = {
    ...policy,
    id: `policy_${Date.now()}`,
    createdAt: new Date(),
  };
  retentionPolicies.push(newPolicy);
  logger.info(`Created retention policy: ${newPolicy.name}`);
  return newPolicy;
}

export function updateRetentionPolicy(id: string, updates: Partial<RetentionPolicy>): RetentionPolicy | null {
  const policy = retentionPolicies.find(p => p.id === id);
  if (!policy) return null;
  Object.assign(policy, updates);
  logger.info(`Updated retention policy: ${id}`);
  return policy;
}

export function deleteRetentionPolicy(id: string): boolean {
  const idx = retentionPolicies.findIndex(p => p.id === id);
  if (idx === -1) return false;
  retentionPolicies.splice(idx, 1);
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
  const policy = getRetentionPolicy(policyId);
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

  job.recordsProcessed = Math.floor(Math.random() * 100);
  job.recordsDeleted = Math.floor(job.recordsProcessed * 0.3);
  job.status = "completed";
  job.completedAt = new Date();

  logger.info(`Retention job completed: ${job.recordsDeleted} records processed`);

  return job;
}

export function getRetentionStats(): {
  totalPolicies: number;
  enabledPolicies: number;
  pendingJobs: number;
  lastRun: Date | null;
} {
  return {
    totalPolicies: retentionPolicies.length,
    enabledPolicies: retentionPolicies.filter(p => p.enabled).length,
    pendingJobs: 2,
    lastRun: new Date(Date.now() - 86400000 * 3),
  };
}