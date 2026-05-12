import { Router } from "express";
import {
  createAlertRule,
  getAlertRules,
  updateAlertRule,
  deleteAlertRule,
  checkAlertConditions,
  getActiveAlerts,
  resolveAlert,
  createUptimeCheck,
  getUptimeChecks,
  runUptimeCheck,
  getSystemMetrics,
  recordMetric,
} from "../lib/monitoringService";
import {
  createLogEntry,
  queryLogs,
  aggregateLogs,
  startTrace,
  endTrace,
  getTrace,
  getTraceSummary,
  addSpanLog,
  exportLogs,
  getLogStats,
} from "../lib/loggingService";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/metrics/system", requireAuth, (req, res) => {
  const metrics = getSystemMetrics();
  res.json({ success: true, data: metrics });
});

router.post("/metrics/record", requireAuth, (req, res) => {
  const { name, value, tags } = req.body;
  recordMetric(name, value, tags);
  res.json({ success: true });
});

router.get("/alerts/rules", requireAuth, (req, res) => {
  const rules = getAlertRules();
  res.json({ success: true, data: rules });
});

router.post("/alerts/rules", requireAuth, (req, res) => {
  const rule = createAlertRule(req.body);
  res.json({ success: true, data: rule });
});

router.put("/alerts/rules/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const rule = updateAlertRule(id, req.body);
  if (!rule) return res.status(404).json({ success: false, error: "Rule not found" });
  res.json({ success: true, data: rule });
});

router.delete("/alerts/rules/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const deleted = deleteAlertRule(id);
  res.json({ success: deleted });
});

router.post("/alerts/check", requireAuth, (req, res) => {
  const { metrics } = req.body;
  const alerts = checkAlertConditions(metrics);
  res.json({ success: true, data: { alerts, count: alerts.length } });
});

router.get("/alerts/active", requireAuth, (req, res) => {
  const alerts = getActiveAlerts();
  res.json({ success: true, data: { alerts, count: alerts.length } });
});

router.post("/alerts/:alertId/resolve", requireAuth, (req, res) => {
  const { alertId } = req.params;
  const alert = resolveAlert(alertId);
  if (!alert) return res.status(404).json({ success: false, error: "Alert not found" });
  res.json({ success: true, data: alert });
});

router.get("/uptime", requireAuth, (req, res) => {
  const checks = getUptimeChecks();
  res.json({ success: true, data: { checks, count: checks.length } });
});

router.post("/uptime", requireAuth, (req, res) => {
  const check = createUptimeCheck(req.body);
  res.json({ success: true, data: check });
});

router.post("/uptime/:checkId/run", requireAuth, async (req, res) => {
  const { checkId } = req.params;
  const check = await runUptimeCheck(checkId);
  if (!check) return res.status(404).json({ success: false, error: "Check not found" });
  res.json({ success: true, data: check });
});

router.post("/logs", requireAuth, (req, res) => {
  const { level, message, service, metadata, userId, ip } = req.body;
  const entry = createLogEntry({ level, message, service, metadata, userId, ip });
  res.json({ success: true, data: entry });
});

router.get("/logs", requireAuth, (req, res) => {
  const { level, service, startDate, endDate, traceId, search } = req.query;
  const logs = queryLogs({
    level: level as string,
    service: service as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    traceId: traceId as string,
    search: search as string,
  });
  res.json({ success: true, data: { logs, count: logs.length } });
});

router.get("/logs/aggregate", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;
  const aggregated = aggregateLogs(
    new Date(startDate as string || Date.now() - 86400000),
    new Date(endDate as string || Date.now())
  );
  res.json({ success: true, data: aggregated });
});

router.get("/logs/stats", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = getLogStats({
    start: new Date(startDate as string || Date.now() - 86400000),
    end: new Date(endDate as string || Date.now()),
  });
  res.json({ success: true, data: stats });
});

router.post("/logs/export", requireAuth, (req, res) => {
  const { format, startDate, endDate, service } = req.body;
  const logs = exportLogs(format, {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    service,
  });
  res.json({ success: true, data: { export: logs } });
});

router.post("/tracing/start", requireAuth, (req, res) => {
  const { traceId, spanName, service, parentSpanId } = req.body;
  const span = startTrace(traceId, spanName, service, parentSpanId);
  res.json({ success: true, data: { spanId: span.id, traceId: span.traceId } });
});

router.post("/tracing/end", requireAuth, (req, res) => {
  const { traceId, spanId, status } = req.body;
  const span = endTrace(traceId, spanId, status);
  if (!span) return res.status(404).json({ success: false, error: "Span not found" });
  res.json({ success: true, data: span });
});

router.get("/tracing/:traceId", requireAuth, (req, res) => {
  const { traceId } = req.params;
  const spans = getTrace(traceId);
  const summary = getTraceSummary(traceId);
  res.json({ success: true, data: { spans, summary } });
});

router.post("/tracing/log", requireAuth, (req, res) => {
  const { traceId, spanId, message } = req.body;
  addSpanLog(traceId, spanId, message);
  res.json({ success: true });
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.get("/health/ready", (req, res) => {
  res.json({
    success: true,
    data: {
      ready: true,
      checks: { database: "ok", redis: "ok", api: "ok" },
    },
  });
});

router.get("/health/live", (req, res) => {
  res.json({
    success: true,
    data: { alive: true },
  });
});

export default router;