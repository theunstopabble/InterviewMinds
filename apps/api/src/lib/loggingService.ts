import { logger } from "./logger";
import { LogEntryModel } from "../models/LogEntry";
import { TraceSpanModel } from "../models/TraceSpan";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  ip?: string;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: "ok" | "error";
  tags?: Record<string, string>;
  logs?: Array<{ timestamp: Date; message: string }>;
}

export interface LogAggregation {
  service: string;
  level: string;
  count: number;
  percentage: number;
}

function toLogEntry(doc: any): LogEntry {
  return {
    id: doc.id,
    timestamp: doc.timestamp || doc.createdAt,
    level: doc.level,
    message: doc.message,
    service: doc.service || "",
    traceId: doc.trace,
    spanId: doc.span,
    metadata: doc.metadata || {},
    userId: doc.metadata?.userId,
    ip: doc.metadata?.ip,
  };
}

function toTraceSpan(doc: any): TraceSpan {
  return {
    id: doc.id,
    traceId: doc.traceId,
    parentSpanId: doc.parentSpanId,
    name: doc.name,
    service: doc.service || "",
    startTime: doc.startedAt || doc.createdAt,
    endTime: doc.endedAt,
    duration: doc.duration,
    status: doc.status,
    tags: doc.metadata || {},
    logs: doc.metadata?.logs || [],
  };
}

export async function createLogEntry(entry: Omit<LogEntry, "id" | "timestamp">): Promise<LogEntry> {
  const doc = await LogEntryModel.create({
    level: entry.level,
    message: entry.message,
    service: entry.service,
    trace: entry.traceId,
    span: entry.spanId,
    metadata: { ...entry.metadata, userId: entry.userId, ip: entry.ip },
    timestamp: new Date(),
  });

  if (entry.level === "error") {
    logger.error(`[${entry.service}] ${entry.message}`);
  } else if (entry.level === "warn") {
    logger.warn(`[${entry.service}] ${entry.message}`);
  } else {
    logger.info(`[${entry.service}] ${entry.message}`);
  }

  return toLogEntry(doc);
}

export async function queryLogs(filters: {
  level?: string;
  service?: string;
  startDate?: Date;
  endDate?: Date;
  traceId?: string;
  search?: string;
}): Promise<LogEntry[]> {
  const query: any = {};

  if (filters.level) query.level = filters.level;
  if (filters.service) query.service = filters.service;
  if (filters.traceId) query.trace = filters.traceId;

  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }

  if (filters.search) {
    const search = filters.search;
    query.$or = [
      { message: { $regex: search, $options: "i" } },
      { service: { $regex: search, $options: "i" } },
    ];
  }

  const docs = await LogEntryModel.find(query)
    .sort({ timestamp: -1 })
    .limit(1000)
    .lean();

  return docs.map(toLogEntry);
}

export async function aggregateLogs(startDate: Date, endDate: Date): Promise<LogAggregation[]> {
  const docs = await LogEntryModel.find({
    timestamp: { $gte: startDate, $lte: endDate },
  }).lean();

  const groups: Record<string, number> = {};
  docs.forEach(log => {
    const key = `${log.service || "unknown"}:${log.level}`;
    groups[key] = (groups[key] || 0) + 1;
  });

  const total = docs.length;

  return Object.entries(groups).map(([key, count]) => {
    const [service, level] = key.split(":");
    return { service, level, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

export async function startTrace(traceId: string, spanName: string, service: string, parentSpanId?: string): Promise<TraceSpan> {
  const doc = await TraceSpanModel.create({
    traceId,
    parentSpanId,
    name: spanName,
    service,
    status: "ok",
    startedAt: new Date(),
  });

  return toTraceSpan(doc);
}

export async function endTrace(traceId: string, spanId: string, status: "ok" | "error" = "ok"): Promise<TraceSpan | null> {
  const doc = await TraceSpanModel.findOneAndUpdate(
    { traceId, id: spanId },
    { status, endedAt: new Date() },
    { new: true }
  );

  if (!doc) return null;

  const duration = doc.duration ?? (
    doc.startedAt ? Date.now() - doc.startedAt.getTime() : 0
  );

  if (!doc.duration) {
    await TraceSpanModel.findOneAndUpdate(
      { traceId, id: spanId },
      { duration }
    );
  }

  return toTraceSpan({ ...(doc.toObject?.() || doc), duration });
}

export async function getTrace(traceId: string): Promise<TraceSpan[]> {
  const docs = await TraceSpanModel.find({ traceId }).sort({ startedAt: 1 }).lean();
  return docs.map(toTraceSpan);
}

export async function getTraceSummary(traceId: string): Promise<{
  traceId: string;
  totalSpans: number;
  duration: number;
  services: string[];
  status: "ok" | "error";
}> {
  const spans = await TraceSpanModel.find({ traceId }).lean();

  const services = [...new Set(spans.map(s => s.service || "").filter(Boolean))];
  const hasError = spans.some(s => s.status === "error");

  let duration = 0;
  const rootSpan = spans.find(s => !s.parentSpanId);
  if (rootSpan?.duration) duration = rootSpan.duration;

  return {
    traceId,
    totalSpans: spans.length,
    duration,
    services,
    status: hasError ? "error" : "ok",
  };
}

export async function addSpanLog(traceId: string, spanId: string, message: string): Promise<void> {
  await TraceSpanModel.findOneAndUpdate(
    { traceId, id: spanId },
    {
      $push: {
        "metadata.logs": { timestamp: new Date(), message },
      },
    }
  );
}

export async function exportLogs(format: "json" | "csv" | "elk", filters?: {
  startDate?: Date;
  endDate?: Date;
  service?: string;
}): Promise<string> {
  const logs = await queryLogs({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    service: filters?.service,
  });

  if (format === "json") {
    return JSON.stringify(logs, null, 2);
  }

  if (format === "csv") {
    const headers = ["timestamp", "level", "service", "message", "traceId", "userId"];
    const rows = logs.map(l => [
      l.timestamp.toISOString(),
      l.level,
      l.service,
      l.message.replace(/,/g, ";"),
      l.traceId || "",
      l.userId || "",
    ].join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  return JSON.stringify(logs.map(l => ({
    "@timestamp": l.timestamp.toISOString(),
    "@level": l.level,
    "service.name": l.service,
    "message": l.message,
    "trace.id": l.traceId,
    "user.id": l.userId,
  })));
}

export async function getLogStats(timeRange: { start: Date; end: Date }): Promise<{
  total: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  errorRate: number;
}> {
  const docs = await LogEntryModel.find({
    timestamp: { $gte: timeRange.start, $lte: timeRange.end },
  }).lean();

  const byLevel: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byService: Record<string, number> = {};

  docs.forEach(log => {
    byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    const svc = log.service || "unknown";
    byService[svc] = (byService[svc] || 0) + 1;
  });

  const errorCount = byLevel.error || 0;
  const errorRate = docs.length > 0 ? (errorCount / docs.length) * 100 : 0;

  return {
    total: docs.length,
    byLevel,
    byService,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}
