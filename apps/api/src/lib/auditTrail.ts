import { AuditLogModel } from "../models/AuditLog";
import { logger } from "./logger";

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure";
}

export interface AuditExportOptions {
  startDate: Date;
  endDate: Date;
  userId?: string;
  action?: string;
  resource?: string;
  status?: "success" | "failure";
  format: "json" | "csv" | "pdf";
}

export async function logAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
  const doc = await AuditLogModel.create({
    userId: entry.userId,
    role: entry.userRole,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId || null,
    metadata: entry.details || {},
    ip: entry.ipAddress,
    userAgent: entry.userAgent,
    status: entry.status,
    statusCode: null,
  });

  logger.info(`Audit: ${entry.action} on ${entry.resource}`);
  return {
    id: doc._id.toString(),
    timestamp: doc.createdAt,
    userId: doc.userId,
    userRole: doc.role,
    action: doc.action,
    resource: doc.resource,
    resourceId: doc.resourceId || undefined,
    details: (doc.metadata as Record<string, unknown>) || {},
    ipAddress: doc.ip || "",
    userAgent: doc.userAgent || "",
    status: doc.status as "success" | "failure",
  };
}

export async function getAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<AuditEntry[]> {
  const query: Record<string, unknown> = {};
  if (filters?.userId) query.userId = filters.userId;
  if (filters?.action) query.action = { $regex: filters.action, $options: "i" };
  if (filters?.resource) query.resource = filters.resource;
  if (filters?.startDate || filters?.endDate) {
    query.createdAt = {};
    if (filters?.startDate) (query.createdAt as Record<string, unknown>)["$gte"] = filters.startDate;
    if (filters?.endDate) (query.createdAt as Record<string, unknown>)["$lte"] = filters.endDate;
  }

  const docs = await AuditLogModel.find(query).sort({ createdAt: -1 }).lean();

  return docs.map(doc => ({
    id: doc._id.toString(),
    timestamp: doc.createdAt,
    userId: doc.userId,
    userRole: doc.role,
    action: doc.action,
    resource: doc.resource,
    resourceId: doc.resourceId || undefined,
    details: (doc.metadata as Record<string, unknown>) || {},
    ipAddress: doc.ip || "",
    userAgent: doc.userAgent || "",
    status: doc.status as "success" | "failure",
  }));
}

export async function exportAuditTrail(options: AuditExportOptions): Promise<{
  entries: AuditEntry[];
  totalCount: number;
  format: string;
  generatedAt: Date;
}> {
  let entries = await getAuditLogs({
    userId: options.userId,
    action: options.action,
    resource: options.resource,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  if (options.status) {
    entries = entries.filter(e => e.status === options.status);
  }

  logger.info(`Exported ${entries.length} audit entries in ${options.format} format`);

  return {
    entries,
    totalCount: entries.length,
    format: options.format,
    generatedAt: new Date(),
  };
}

export function generateAuditCSV(entries: AuditEntry[]): string {
  const headers = ["ID", "Timestamp", "User ID", "User Role", "Action", "Resource", "Resource ID", "Status", "IP Address"];
  const rows = entries.map(e => [
    e.id,
    e.timestamp.toISOString(),
    e.userId,
    e.userRole,
    e.action,
    e.resource,
    e.resourceId || "",
    e.status,
    e.ipAddress,
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

export async function getAuditStats(dateRange: { start: Date; end: Date }): Promise<{
  totalEntries: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  byResource: Record<string, number>;
  successRate: number;
}> {
  const entries = await getAuditLogs({ startDate: dateRange.start, endDate: dateRange.end });

  const byAction: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const byResource: Record<string, number> = {};

  entries.forEach(e => {
    byAction[e.action] = (byAction[e.action] || 0) + 1;
    byUser[e.userId] = (byUser[e.userId] || 0) + 1;
    byResource[e.resource] = (byResource[e.resource] || 0) + 1;
  });

  const successCount = entries.filter(e => e.status === "success").length;
  const successRate = entries.length > 0 ? (successCount / entries.length) * 100 : 0;

  return {
    totalEntries: entries.length,
    byAction,
    byUser,
    byResource,
    successRate: Math.round(successRate),
  };
}

export async function searchAuditLogs(query: string): Promise<AuditEntry[]> {
  const docs = await AuditLogModel.find({
    $or: [
      { action: { $regex: query, $options: "i" } },
      { resource: { $regex: query, $options: "i" } },
      { userId: { $regex: query, $options: "i" } },
    ],
  }).sort({ createdAt: -1 }).lean();

  return docs.map(doc => ({
    id: doc._id.toString(),
    timestamp: doc.createdAt,
    userId: doc.userId,
    userRole: doc.role,
    action: doc.action,
    resource: doc.resource,
    resourceId: doc.resourceId || undefined,
    details: (doc.metadata as Record<string, unknown>) || {},
    ipAddress: doc.ip || "",
    userAgent: doc.userAgent || "",
    status: doc.status as "success" | "failure",
  }));
}
