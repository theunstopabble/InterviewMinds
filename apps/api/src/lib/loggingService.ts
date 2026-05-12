import { logger } from "./logger";

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

const logStore: LogEntry[] = [];
const traceStore: Map<string, TraceSpan[]> = new Map();

export function createLogEntry(entry: Omit<LogEntry, "id" | "timestamp">): LogEntry {
  const newEntry: LogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };
  
  logStore.push(newEntry);
  
  if (entry.level === "error") {
    logger.error(`[${entry.service}] ${entry.message}`);
  } else if (entry.level === "warn") {
    logger.warn(`[${entry.service}] ${entry.message}`);
  } else {
    logger.info(`[${entry.service}] ${entry.message}`);
  }
  
  return newEntry;
}

export function queryLogs(filters: {
  level?: string;
  service?: string;
  startDate?: Date;
  endDate?: Date;
  traceId?: string;
  search?: string;
}): LogEntry[] {
  let results = [...logStore];
  
  if (filters.level) results = results.filter(l => l.level === filters.level);
  if (filters.service) results = results.filter(l => l.service === filters.service);
  if (filters.traceId) results = results.filter(l => l.traceId === filters.traceId);
  if (filters.startDate) results = results.filter(l => l.timestamp >= filters.startDate!);
  if (filters.endDate) results = results.filter(l => l.timestamp <= filters.endDate!);
  if (filters.search) {
    const search = filters.search.toLowerCase();
    results = results.filter(l => 
      l.message.toLowerCase().includes(search) ||
      l.service.toLowerCase().includes(search)
    );
  }
  
  return results.slice(-1000);
}

export function aggregateLogs(startDate: Date, endDate: Date): LogAggregation[] {
  const filtered = logStore.filter(l => l.timestamp >= startDate && l.timestamp <= endDate);
  
  const groups: Record<string, number> = {};
  filtered.forEach(log => {
    const key = `${log.service}:${log.level}`;
    groups[key] = (groups[key] || 0) + 1;
  });
  
  const total = filtered.length;
  
  return Object.entries(groups).map(([key, count]) => {
    const [service, level] = key.split(":");
    return { service, level, count, percentage: Math.round((count / total) * 100) };
  });
}

export function startTrace(traceId: string, spanName: string, service: string, parentSpanId?: string): TraceSpan {
  const span: TraceSpan = {
    id: `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    traceId,
    parentSpanId,
    name: spanName,
    service,
    startTime: new Date(),
    status: "ok",
  };
  
  const spans = traceStore.get(traceId) || [];
  spans.push(span);
  traceStore.set(traceId, spans);
  
  return span;
}

export function endTrace(traceId: string, spanId: string, status: "ok" | "error" = "ok"): TraceSpan | null {
  const spans = traceStore.get(traceId);
  if (!spans) return null;
  
  const span = spans.find(s => s.id === spanId);
  if (!span) return null;
  
  span.endTime = new Date();
  span.duration = span.endTime.getTime() - span.startTime.getTime();
  span.status = status;
  
  return span;
}

export function getTrace(traceId: string): TraceSpan[] {
  return traceStore.get(traceId) || [];
}

export function getTraceSummary(traceId: string): {
  traceId: string;
  totalSpans: number;
  duration: number;
  services: string[];
  status: "ok" | "error";
} {
  const spans = traceStore.get(traceId) || [];
  
  const services = [...new Set(spans.map(s => s.service))];
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

export function addSpanLog(traceId: string, spanId: string, message: string): void {
  const spans = traceStore.get(traceId);
  if (!spans) return;
  
  const span = spans.find(s => s.id === spanId);
  if (span) {
    span.logs = span.logs || [];
    span.logs.push({ timestamp: new Date(), message });
  }
}

export function exportLogs(format: "json" | "csv" | "elk", filters?: {
  startDate?: Date;
  endDate?: Date;
  service?: string;
}): string {
  const logs = queryLogs({
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

export function getLogStats(timeRange: { start: Date; end: Date }): {
  total: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  errorRate: number;
} {
  const logs = queryLogs({ startDate: timeRange.start, endDate: timeRange.end });
  
  const byLevel: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byService: Record<string, number> = {};
  
  logs.forEach(log => {
    byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    byService[log.service] = (byService[log.service] || 0) + 1;
  });
  
  const errorCount = byLevel.error || 0;
  const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;
  
  return {
    total: logs.length,
    byLevel,
    byService,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}