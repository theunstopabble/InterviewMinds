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

const auditLog: AuditEntry[] = [];

export function logAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const newEntry: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };
  auditLog.push(newEntry);
  logger.info(`Audit: ${entry.action} on ${entry.resource}`);
  return newEntry;
}

export function getAuditLogs(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}): AuditEntry[] {
  let results = [...auditLog];

  if (filters?.userId) {
    results = results.filter(e => e.userId === filters.userId);
  }
  if (filters?.action) {
    results = results.filter(e => e.action.includes(filters.action as string));
  }
  if (filters?.resource) {
    results = results.filter(e => e.resource === filters.resource);
  }
  if (filters?.startDate) {
    results = results.filter(e => e.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    results = results.filter(e => e.timestamp <= filters.endDate!);
  }

  return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function exportAuditTrail(options: AuditExportOptions): {
  entries: AuditEntry[];
  totalCount: number;
  format: string;
  generatedAt: Date;
} {
  let entries = getAuditLogs({
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

export function getAuditStats(dateRange: { start: Date; end: Date }): {
  totalEntries: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  byResource: Record<string, number>;
  successRate: number;
} {
  const entries = getAuditLogs({ startDate: dateRange.start, endDate: dateRange.end });

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

export function searchAuditLogs(query: string): AuditEntry[] {
  const lowerQuery = query.toLowerCase();
  return auditLog.filter(e =>
    e.action.toLowerCase().includes(lowerQuery) ||
    e.resource.toLowerCase().includes(lowerQuery) ||
    e.userId.toLowerCase().includes(lowerQuery) ||
    JSON.stringify(e.details).toLowerCase().includes(lowerQuery)
  );
}