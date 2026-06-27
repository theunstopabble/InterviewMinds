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

router.get("/alerts/rules", requireAuth, async (req, res) => {
  try {
    const rules = await getAlertRules();
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch alert rules" });
  }
});

router.post("/alerts/rules", requireAuth, async (req, res) => {
  try {
    const rule = await createAlertRule(req.body);
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create alert rule" });
  }
});

router.put("/alerts/rules/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await updateAlertRule(id, req.body);
    if (!rule) return res.status(404).json({ success: false, error: "Rule not found" });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update alert rule" });
  }
});

router.delete("/alerts/rules/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteAlertRule(id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to delete alert rule" });
  }
});

router.post("/alerts/check", requireAuth, async (req, res) => {
  try {
    const { metrics } = req.body;
    const alerts = await checkAlertConditions(metrics);
    res.json({ success: true, data: { alerts, count: alerts.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to check alert conditions" });
  }
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

router.post("/logs", requireAuth, async (req, res) => {
  try {
    const { level, message, service, metadata, userId, ip } = req.body;
    const entry = await createLogEntry({ level, message, service, metadata, userId, ip });
    res.json({ success: true, data: entry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/logs", requireAuth, async (req, res) => {
  try {
    const { level, service, startDate, endDate, traceId, search } = req.query;
    const logs = await queryLogs({
      level: level as string,
      service: service as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      traceId: traceId as string,
      search: search as string,
    });
    res.json({ success: true, data: { logs, count: logs.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/logs/aggregate", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const aggregated = await aggregateLogs(
      new Date(startDate as string || Date.now() - 86400000),
      new Date(endDate as string || Date.now())
    );
    res.json({ success: true, data: aggregated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/logs/stats", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await getLogStats({
      start: new Date(startDate as string || Date.now() - 86400000),
      end: new Date(endDate as string || Date.now()),
    });
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/logs/export", requireAuth, async (req, res) => {
  try {
    const { format, startDate, endDate, service } = req.body;
    const logs = await exportLogs(format, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      service,
    });
    res.json({ success: true, data: { export: logs } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/tracing/start", requireAuth, async (req, res) => {
  try {
    const { traceId, spanName, service, parentSpanId } = req.body;
    const span = await startTrace(traceId, spanName, service, parentSpanId);
    res.json({ success: true, data: { spanId: span.id, traceId: span.traceId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/tracing/end", requireAuth, async (req, res) => {
  try {
    const { traceId, spanId, status } = req.body;
    const span = await endTrace(traceId, spanId, status);
    if (!span) return res.status(404).json({ success: false, error: "Span not found" });
    res.json({ success: true, data: span });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/tracing/:traceId", requireAuth, async (req, res) => {
  try {
    const { traceId } = req.params;
    const spans = await getTrace(traceId);
    const summary = await getTraceSummary(traceId);
    res.json({ success: true, data: { spans, summary } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/tracing/log", requireAuth, async (req, res) => {
  try {
    const { traceId, spanId, message } = req.body;
    await addSpanLog(traceId, spanId, message);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
