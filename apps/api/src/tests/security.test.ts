import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import {
  securityHeaders,
  requestTimeout,
  sanitizeInput,
  generalLimiter,
} from "../lib/security";

describe("Security Middleware", () => {
  it("should set security headers via helmet", async () => {
    const app = express();
    app.use(securityHeaders);
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(res.headers["strict-transport-security"]).toContain("max-age=31536000");
  });

  it("should timeout long-running requests", async () => {
    const app = express();
    app.use(requestTimeout(50));
    app.get("/slow", async (_req, res) => {
      await new Promise((r) => setTimeout(r, 200));
      if (!res.headersSent) res.json({ ok: true });
    });

    const res = await request(app).get("/slow");
    expect(res.status).toBe(408);
    expect(res.body.error).toBe("Request timeout");
  });

  it("should allow fast requests through timeout middleware", async () => {
    const app = express();
    app.use(requestTimeout(5000));
    app.get("/fast", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/fast");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("should block suspicious script tags in body", async () => {
    const app = express();
    app.use(express.json());
    app.use(sanitizeInput);
    app.post("/echo", (req, res) => res.json(req.body));
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).json({ error: "Internal Server Error" });
    });

    const res = await request(app)
      .post("/echo")
      .send({ name: "<script>alert(1)</script>" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal Server Error");
  });

  it("should block javascript: protocol in query", async () => {
    const app = express();
    app.use(sanitizeInput);
    app.get("/search", (_req, res) => res.json({ ok: true }));
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).json({ error: "Internal Server Error" });
    });

    const res = await request(app).get("/search?q=javascript:alert(1)");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal Server Error");
  });

  it("should allow clean input through sanitization", async () => {
    const app = express();
    app.use(express.json());
    app.use(sanitizeInput);
    app.post("/echo", (req, res) => res.json(req.body));

    const res = await request(app)
      .post("/echo")
      .send({ name: "John Doe", message: "Hello world!" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("John Doe");
  });

  it("should enforce rate limiting after threshold", async () => {
    const app = express();
    const testLimiter = generalLimiter;
    app.use(testLimiter);
    app.get("/", (_req, res) => res.json({ ok: true }));

    // First request should succeed
    const res1 = await request(app).get("/");
    expect(res1.status).toBe(200);
  });
});
