import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express, { Response } from "express";
import { auditLog } from "../middleware/audit";

// Mock AuditLogModel
const mockCreate = vi.fn();
vi.mock("../models/AuditLog", () => ({
  AuditLogModel: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

describe("Audit Logging Middleware", () => {
  beforeEach(() => {
    mockCreate.mockReset().mockResolvedValue({});
  });

  it("should write audit log on successful request", async () => {
    const app = express();
    app.use((req: any, _res, next) => {
      req.auth = { userId: "user-123" };
      req.userRole = "candidate";
      req.correlationId = "corr-abc";
      next();
    });
    app.use(auditLog("resume"));
    app.get("/", (_req, res: Response) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);

    // Wait for async audit write
    await new Promise((r) => setTimeout(r, 20));
    expect(mockCreate).toHaveBeenCalled();
    const logEntry = mockCreate.mock.calls[0][0];
    expect(logEntry.userId).toBe("user-123");
    expect(logEntry.role).toBe("candidate");
    expect(logEntry.resource).toBe("resume");
    expect(logEntry.status).toBe("success");
    expect(logEntry.statusCode).toBe(200);
  });

  it("should write audit log with failure status on error response", async () => {
    const app = express();
    app.use((req: any, _res, next) => {
      req.auth = { userId: "user-456" };
      req.userRole = "admin";
      next();
    });
    app.use(auditLog("interview"));
    app.get("/", (_req, res: Response) => res.status(500).json({ error: "boom" }));

    await request(app).get("/");
    await new Promise((r) => setTimeout(r, 20));

    const logEntry = mockCreate.mock.calls[0][0];
    expect(logEntry.status).toBe("failure");
    expect(logEntry.statusCode).toBe(500);
    expect(logEntry.resource).toBe("interview");
  });

  it("should include metadata with query and params", async () => {
    const app = express();
    app.use((req: any, _res, next) => {
      req.auth = { userId: "user-789" };
      req.userRole = "interviewer";
      next();
    });
    app.use(auditLog("resume"));
    app.get("/search", (req: any, res: Response) => res.json({ q: req.query.q }));

    await request(app).get("/search?q=test");
    await new Promise((r) => setTimeout(r, 20));

    const logEntry = mockCreate.mock.calls[0][0];
    expect(logEntry.metadata.query).toEqual({ q: "test" });
  });

  it("should still respond even if audit write fails", async () => {
    mockCreate.mockRejectedValue(new Error("DB down"));
    const app = express();
    app.use((req: any, _res, next) => {
      req.auth = { userId: "user-000" };
      req.userRole = "candidate";
      next();
    });
    app.use(auditLog("compiler"));
    app.get("/", (_req, res: Response) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
