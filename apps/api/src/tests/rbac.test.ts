import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { attachRole, requirePermission, requireRole } from "../middleware/rbac";

// Mutable store hoisted above vi.mock factories
const mockRoleStore = vi.hoisted(() => ({ roleRecord: null as any }));

vi.mock("../models/Role", () => ({
  UserRoleModel: {
    findOne: vi.fn(() => ({
      lean: vi.fn(() => Promise.resolve(mockRoleStore.roleRecord)),
    })),
  },
  hasPermission: vi.fn((role: string, permission: string) => {
    const perms: Record<string, string[]> = {
      candidate: ["resume:create", "resume:read_own"],
      interviewer: ["resume:read_any", "interview:evaluate"],
      admin: ["*"],
    };
    return (perms[role] || []).includes("*") || (perms[role] || []).includes(permission);
  }),
  RolePermissions: {},
}));

function mockAuth(userId: string) {
  return (req: any, _res: any, next: any) => {
    req.auth = { userId };
    next();
  };
}

describe("RBAC Middleware", () => {
  beforeEach(() => {
    mockRoleStore.roleRecord = null;
  });

  it("attachRole should default to candidate when no record exists", async () => {
    mockRoleStore.roleRecord = null;
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.get("/", (req: any, res) => res.json({ role: req.userRole }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("candidate");
  });

  it("attachRole should read role from UserRoleModel", async () => {
    mockRoleStore.roleRecord = { role: "admin" };
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.get("/", (req: any, res) => res.json({ role: req.userRole }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
  });

  it("requirePermission should allow candidate with correct permission", async () => {
    mockRoleStore.roleRecord = { role: "candidate" };
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.use(requirePermission("resume:create"));
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("requirePermission should deny candidate without permission", async () => {
    mockRoleStore.roleRecord = { role: "candidate" };
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.use(requirePermission("interview:evaluate"));
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("requirePermission should allow admin wildcard access", async () => {
    mockRoleStore.roleRecord = { role: "admin" };
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.use(requirePermission("any:permission"));
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("requireRole should allow matching role", async () => {
    mockRoleStore.roleRecord = { role: "interviewer" };
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.use(requireRole("interviewer", "admin"));
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("requireRole should deny non-matching role", async () => {
    mockRoleStore.roleRecord = { role: "candidate" };
    const app = express();
    app.use(mockAuth("user-123"));
    app.use(attachRole);
    app.use(requireRole("interviewer"));
    app.get("/", (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });
});
