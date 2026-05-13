import axios from "axios";
import { logger } from "./logger";

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
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
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

const alertRules: AlertRule[] = [
  {
    id: "rule_001",
    name: "High Error Rate",
    condition: { metric: "error_rate", operator: "gt", threshold: 5 },
    severity: "critical",
    enabled: true,
    channels: ["email", "slack"],
    createdAt: new Date(),
  },
  {
    id: "rule_002",
    name: "High Latency",
    condition: { metric: "latency_p99", operator: "gt", threshold: 2000, duration: 300 },
    severity: "warning",
    enabled: true,
    channels: ["slack"],
    createdAt: new Date(),
  },
];

const activeAlerts: Alert[] = [];

const uptimeChecks: UptimeCheck[] = [];

export function createAlertRule(rule: Omit<AlertRule, "id" | "createdAt">): AlertRule {
  const newRule: AlertRule = {
    ...rule,
    id: `rule_${Date.now()}`,
    createdAt: new Date(),
  };
  alertRules.push(newRule);
  logger.info(`Alert rule created: ${newRule.name}`);
  return newRule;
}

export function getAlertRules(): AlertRule[] {
  return alertRules;
}

export function updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
  const rule = alertRules.find(r => r.id === id);
  if (!rule) return null;
  Object.assign(rule, updates);
  return rule;
}

export function deleteAlertRule(id: string): boolean {
  const idx = alertRules.findIndex(r => r.id === id);
  if (idx !== -1) {
    alertRules.splice(idx, 1);
    return true;
  }
  return false;
}

export function checkAlertConditions(metrics: MetricData[]): Alert[] {
  const triggeredAlerts: Alert[] = [];

  for (const rule of alertRules.filter(r => r.enabled)) {
    const metric = metrics.find(m => m.name === rule.condition.metric);
    if (!metric) continue;

    let triggered = false;
    const { operator, threshold } = rule.condition;

    switch (operator) {
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
        message: `${rule.name}: ${metric.value} ${rule.condition.operator} ${threshold}`,
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

  /* Simple exponential moving average for uptime percentage */
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
  /* cpuUsage.user + system in microseconds; rough % over 1s sample would need history.
     Here we report raw derived value scaled to approximate percentage. */
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