import { Request, Response, NextFunction } from "express";
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";

// ============================================================================
// 1. Default Node.js metrics (GC, event loop, memory, CPU)
// ============================================================================
collectDefaultMetrics({
  prefix: "interviewminds_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ============================================================================
// 2. HTTP Request Metrics
// ============================================================================

export const httpRequestDuration = new Histogram({
  name: "interviewminds_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: "interviewminds_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const httpRequestErrors = new Counter({
  name: "interviewminds_http_request_errors_total",
  help: "Total number of HTTP request errors (4xx/5xx)",
  labelNames: ["method", "route", "status_code"],
});

// ============================================================================
// 3. Application Business Metrics
// ============================================================================

export const aiCallsTotal = new Counter({
  name: "interviewminds_ai_calls_total",
  help: "Total AI API calls by service",
  labelNames: ["service", "model"],
});

export const aiCallDuration = new Histogram({
  name: "interviewminds_ai_call_duration_seconds",
  help: "Duration of AI API calls in seconds",
  labelNames: ["service"],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
});

export const interviewsCompleted = new Counter({
  name: "interviewminds_interviews_completed_total",
  help: "Total completed interviews",
  labelNames: ["outcome"],
});

export const resumesUploaded = new Counter({
  name: "interviewminds_resumes_uploaded_total",
  help: "Total resumes uploaded",
});

export const codeExecutions = new Counter({
  name: "interviewminds_code_executions_total",
  help: "Total code executions via compiler",
  labelNames: ["language", "status"],
});

export const activeSocketConnections = new Gauge({
  name: "interviewminds_active_socket_connections",
  help: "Current active Socket.IO connections",
});

export const messagesSent = new Counter({
  name: "interviewminds_messages_sent_total",
  help: "Total chat messages sent",
  labelNames: ["room_id"],
});

// ============================================================================
// 4. Express Middleware — Auto-record HTTP metrics
// ============================================================================

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = process.hrtime.bigint();

  // Normalize route pattern for consistent labeling (e.g. /api/interview/:id)
  const route = req.route?.path || req.path || "unknown";

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9; // seconds
    const status = res.statusCode.toString();
    const method = req.method;

    httpRequestDuration.observe(
      { method, route, status_code: status },
      duration,
    );
    httpRequestTotal.inc({ method, route, status_code: status });

    if (res.statusCode >= 400) {
      httpRequestErrors.inc({ method, route, status_code: status });
    }
  });

  next();
}

// ============================================================================
// 5. Export Prometheus register for /metrics endpoint
// ============================================================================
export { register };
