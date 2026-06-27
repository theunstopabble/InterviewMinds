import axios from "axios";
import { logger } from "./logger";
import { AlertRuleModel, IAlertRule } from "../models/AlertRule";

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte" | "ne";
    threshold: number;
    duration?: number;
  };
  severity: "critical" | "warning" | "info";
  enabled: boolean;
  channels: string[];
  createdAt: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: "critical" | "warning" | "info";
  message: string;
  status: "firing" | "resolved";
  firedAt: Date;
  resolvedAt?: Date;
}

export interface UptimeCheck {
  id: string;
  name: string;
  url: string;
  interval: number;
  timeout: number;
  status: "up" | "down" | "degraded";
  lastCheck: Date;
  uptimePercentage: number;
}

function toAlertRule(doc: IAlertRule): AlertRule {
  return {
    id: doc.id,
    name: doc.name,
    condition: {
      metric: doc.metric,
      operator: doc.condition,
      threshold: doc.threshold,
      duration: doc.duration || undefined,
    },
    severity: doc.severity,
    enabled: doc.isActive,
    channels: doc.channels,
    createdAt: doc.createdAt,
  };
}

const activeAlerts: Alert[] = [];
const uptimeChecks: UptimeCheck[] = [];

export async function createAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): Promise<AlertRule> {
  const doc = await AlertRuleModel.create({
    name: rule.name,
    description: `${rule.severity} alert`,
    metric: rule.condition.metric,
    condition: rule.condition.operator,
    threshold: rule.condition.threshold,
    duration: rule.condition.duration || 0,
    severity: rule.severity,
    channels: rule.channels,
    isActive: rule.enabled,
  });
  logger.info(`Alert rule created: ${doc.name}`);
  return toAlertRule(doc);
}

export async function getAlertRules(): Promise<AlertRule[]> {
  const docs = await AlertRuleModel.find().lean();
  return docs.map(toAlertRule);
}

export async function updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
  const setFields: Record<string, unknown> = {};
  if (updates.name !== undefined) setFields.name = updates.name;
  if (updates.severity !== undefined) setFields.severity = updates.severity;
  if (updates.enabled !== undefined) setFields.isActive = updates.enabled;
  if (updates.channels !== undefined) setFields.channels = updates.channels;
  if (updates.condition) {
    if (updates.condition.metric !== undefined) setFields.metric = updates.condition.metric;
    if (updates.condition.operator !== undefined) setFields.condition = updates.condition.operator;
    if (updates.condition.threshold !== undefined) setFields.threshold = updates.condition.threshold;
    if (updates.condition.duration !== undefined) setFields.duration = updates.condition.duration;
  }
  const doc = await AlertRuleModel.findOneAndUpdate(
    { id },
    { $set: setFields },
    { new: true }
  );
  if (!doc) return null;
  return toAlertRule(doc);
}

export async function deleteAlertRule(id: string): Promise<boolean> {
  const result = await AlertRuleModel.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function checkAlertConditions(metrics: MetricData[]): Promise<Alert[]> {
  const rules = await AlertRuleModel.find({ isActive: true }).lean();
  const triggeredAlerts: Alert[] = [];

  for (const rule of rules) {
    const metric = metrics.find(m => m.name === rule.metric);
    if (!metric) continue;

    let triggered = false;
    const { condition, threshold } = rule;

    switch (condition) {
      case "gt": triggered = metric.value > threshold; break;
      case "lt": triggered = metric.value < threshold; break;
      case "eq": triggered = metric.value === threshold; break;
      case "gte": triggered = metric.value >= threshold; break;
      case "lte": triggered = metric.value <= threshold; break;
    }

    if (triggered) {
      const alert: Alert = {
        id: `alert_${Date.now()}`,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `${rule.name}: ${metric.value} ${rule.condition} ${threshold}`,
        status: "firing",
        firedAt: new Date(),
      };
      activeAlerts.push(alert);
      triggeredAlerts.push(alert);
    }
  }

  return triggeredAlerts;
}

export function getActiveAlerts(): Alert[] {
  return activeAlerts.filter(a => a.status === "firing");
}

export function resolveAlert(alertId: string): Alert | null {
  const alert = activeAlerts.find(a => a.id === alertId) || null;
  if (alert) {
    alert.status = "resolved";
    alert.resolvedAt = new Date();
  }
  return alert;
}

export function createUptimeCheck(check: Omit<UptimeCheck, "id" | "status" | "lastCheck" | "uptimePercentage">): UptimeCheck {
  const newCheck: UptimeCheck = {
    ...check,
    id: `uptime_${Date.now()}`,
    status: "up",
    lastCheck: new Date(),
    uptimePercentage: 100,
  };
  uptimeChecks.push(newCheck);
  logger.info(`Uptime check created: ${newCheck.name}`);
  return newCheck;
}

export function getUptimeChecks(): UptimeCheck[] {
  return uptimeChecks;
}

export async function runUptimeCheck(checkId: string): Promise<UptimeCheck | null> {
  const check = uptimeChecks.find(c => c.id === checkId);
  if (!check) return null;

  logger.info({ checkId: check.id, url: check.url }, "Running uptime check");
  check.lastCheck = new Date();

  try {
    const start = Date.now();
    const res = await axios.get(check.url, { timeout: check.timeout || 10000, validateStatus: () => true });
    const latency = Date.now() - start;
    check.status = res.status >= 200 && res.status < 400 ? "up" : "down";
    if (latency > 2000) check.status = "degraded";
  } catch {
    check.status = "down";
  }

  const alpha = 0.1;
  const upValue = check.status === "up" ? 100 : 0;
  check.uptimePercentage = check.uptimePercentage * (1 - alpha) + upValue * alpha;

  return check;
}

let requestCount = 0;
let errorCount = 0;
const latencies: number[] = [];

export function recordRequest(latencyMs: number, isError: boolean): void {
  requestCount++;
  if (isError) errorCount++;
  latencies.push(latencyMs);
  if (latencies.length > 10000) latencies.shift();
}

export function getSystemMetrics(): {
  cpu: number;
  memory: number;
  requests: number;
  errors: number;
  latency: { p50: number; p95: number; p99: number };
} {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const cpuPercent = Math.min(100, Math.round(((cpuUsage.user + cpuUsage.system) / 1_000_000) % 100));
  const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (arr: number[], pct: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.ceil((pct / 100) * arr.length) - 1;
    return arr[Math.max(0, idx)];
  };

  return {
    cpu: cpuPercent,
    memory: memPercent,
    requests: requestCount,
    errors: errorCount,
    latency: {
      p50: p(sorted, 50),
      p95: p(sorted, 95),
      p99: p(sorted, 99),
    },
  };
}

export function recordMetric(name: string, value: number, tags?: Record<string, string>): void {
  logger.info(`Metric recorded: ${name}=${value}`);
}
