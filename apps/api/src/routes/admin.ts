import express, { Response } from "express";
import { InterviewModel } from "../models/Interview";
import { AuditLogModel } from "../models/AuditLog";
import { UserRoleModel } from "../models/Role";
import { RBACRequest } from "../middleware/rbac";
import { requirePermission } from "../middleware/rbac";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
router.get(
  "/dashboard",
  requirePermission("audit:read"),
  async (req: RBACRequest, res: Response) => {
    try {
      const days = parseInt((req.query.days as string) || "7", 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const [
        totalInterviews,
        recentInterviews,
        avgScore,
        totalUsers,
        recentAuditLogs,
        roleDistribution,
      ] = await Promise.all([
        InterviewModel.countDocuments(),
        InterviewModel.countDocuments({ createdAt: { $gte: cutoff } }),
        InterviewModel.aggregate([
          { $group: { _id: null, avgScore: { $avg: "$score" } } },
        ]),
        UserRoleModel.countDocuments(),
        AuditLogModel.find()
          .sort({ createdAt: -1 })
          .limit(50)
          .lean(),
        UserRoleModel.aggregate([
          { $group: { _id: "$role", count: { $sum: 1 } } },
        ]),
      ]);

      res.json({
        summary: {
          totalInterviews,
          recentInterviews,
          avgScore: avgScore.length ? Math.round(avgScore[0].avgScore * 10) / 10 : 0,
          totalUsers,
        },
        roleDistribution: roleDistribution.map((r) => ({
          role: r._id,
          count: r.count,
        })),
        recentActivity: recentAuditLogs.map((a: any) => ({
          id: a._id?.toString?.() || String(a._id),
          userId: a.userId,
          action: a.action,
          resource: a.resource,
          status: a.status,
          createdAt: a.createdAt?.toISOString?.() || a.createdAt,
        })),
      });
    } catch (err: unknown) {
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  },
);

// ─── GET /api/admin/users ───────────────────────────────────────────────────
router.get(
  "/users",
  requirePermission("user:read"),
  async (req: RBACRequest, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || "50", 10);
      const offset = parseInt((req.query.offset as string) || "0", 10);

      const [users, total] = await Promise.all([
        UserRoleModel.find()
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        UserRoleModel.countDocuments(),
      ]);

      res.json({
        users: users.map((u: any) => ({
          id: u._id?.toString?.() || String(u._id),
          userId: u.userId,
          role: u.role,
          assignedAt: u.assignedAt?.toISOString?.() || u.assignedAt,
          assignedBy: u.assignedBy,
        })),
        total,
        hasMore: offset + users.length < total,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// ─── POST /api/admin/assign-role ────────────────────────────────────────────────
// Note: If no admin exists yet, anyone can create the first admin
router.post(
  "/assign-role",
  requireAuth,
  async (req: RBACRequest, res: Response) => {
    try {
      const { userId, role } = req.body;
      const currentUserId = req.auth?.userId;
      
      // Check if admin already exists
      const adminExists = await UserRoleModel.findOne({ role: "admin" });
      const currentUserRole = currentUserId ? await UserRoleModel.findOne({ userId: currentUserId }) : null;
      const isCurrentUserAdmin = currentUserRole?.role === "admin";

      // If admin exists and current user is not admin, require permission
      if (adminExists && !isCurrentUserAdmin) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }

      if (!userId || !role) {
        res.status(400).json({ error: "userId and role are required" });
        return;
      }

      if (!["candidate", "interviewer", "admin"].includes(role)) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }

      const updatedRole = await UserRoleModel.findOneAndUpdate(
        { userId },
        { 
          role, 
          assignedBy: currentUserId || "system",
          assignedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      res.json({ success: true, role: updatedRole });
    } catch (err: unknown) {
      res.status(500).json({ error: "Failed to assign role" });
    }
  },
);

export default router;
