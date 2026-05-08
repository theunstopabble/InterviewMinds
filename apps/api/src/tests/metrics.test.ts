import { describe, it, expect } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import { metricsMiddleware, register } from "../lib/metrics";

describe("Metrics & Health", () => {
  it("should expose Prometheus metrics at /metrics", async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get("/test-path", (_req, res: Response) => res.json({ ok: true }));
    app.get("/metrics", async (_req, res: Response) => {
      res.setHeader("Content-Type", register.contentType);
      res.status(200).send(await register.metrics());
    });

    // Warm up by hitting an endpoint
    const hitRes = await request(app).get("/test-path");
    expect(hitRes.status).toBe(200);

    const metricsRes = await request(app).get("/metrics");
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.headers["content-type"]).toContain("text/plain");
    expect(metricsRes.text).toContain("interviewminds_http_requests_total");
    expect(metricsRes.text).toContain("interviewminds_http_request_duration_seconds");
  });

  it("should include default Node.js metrics", async () => {
    const app = express();
    app.get("/metrics", async (_req, res: Response) => {
      res.setHeader("Content-Type", register.contentType);
      res.status(200).send(await register.metrics());
    });

    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    // Default metrics from prom-client
    expect(res.text).toContain("nodejs_");
  });

  it("should record request latency and status codes", async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get("/ok", (_req, res: Response) => res.json({ ok: true }));
    app.get("/err", (_req, res: Response) => res.status(500).json({ error: "boom" }));
    app.get("/metrics", async (_req, res: Response) => {
      res.setHeader("Content-Type", register.contentType);
      res.status(200).send(await register.metrics());
    });

    await request(app).get("/ok");
    await request(app).get("/err");

    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain('status_code="200"');
    expect(res.text).toContain('status_code="500"');
    expect(res.text).toContain("interviewminds_http_request_errors_total");
  });
});
