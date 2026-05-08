import { GraphQLError } from "graphql";
import { InterviewModel } from "../models/Interview";
import { UserRoleModel, hasPermission } from "../models/Role";
import { AuditLogModel } from "../models/AuditLog";
import { WebhookModel } from "../models/Webhook";

interface Context {
  userId: string;
  userRole: "candidate" | "interviewer" | "admin";
}

function requireAuth(ctx: Context): asserts ctx is Context & { userId: string } {
  if (!ctx.userId) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}

function requirePermission(ctx: Context, permission: string) {
  if (!hasPermission(ctx.userRole, permission)) {
    throw new GraphQLError("Forbidden", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

export const resolvers = {
  Query: {
    async me(_parent: unknown, _args: unknown, ctx: Context) {
      requireAuth(ctx);
      const roleRecord = await UserRoleModel.findOne({ userId: ctx.userId }).lean();
      const interviewCount = await InterviewModel.countDocuments({ userId: ctx.userId });
      const resumeCount = 0; // TODO: hook up ResumeModel

      return {
        id: ctx.userId,
        role: roleRecord?.role || "candidate",
        interviewCount,
        resumeCount,
        lastActivity: new Date().toISOString(),
      };
    },

    async interviews(
      _parent: unknown,
      { limit = 20, offset = 0 }: { limit: number; offset: number },
      ctx: Context,
    ) {
      requireAuth(ctx);
      const [items, total] = await Promise.all([
        InterviewModel.find({ userId: ctx.userId })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        InterviewModel.countDocuments({ userId: ctx.userId }),
      ]);

      return {
        items: items.map((i: any) => ({
          id: i._id?.toString?.() || String(i._id),
          ...i,
          createdAt: i.createdAt?.toISOString?.() || i.createdAt,
        })),
        total,
        hasMore: offset + items.length < total,
      };
    },

    async interview(_parent: unknown, { id }: { id: string }, ctx: Context) {
      requireAuth(ctx);
      const doc = await InterviewModel.findById(id).lean();
      if (!doc || doc.userId !== ctx.userId) return null;
      return {
        id: (doc._id as any)?.toString?.() || String(doc._id),
        ...doc,
        createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
      };
    },

    async resumes(_parent: unknown, _args: unknown, _ctx: Context) {
      // Placeholder — return empty for now
      return [];
    },

    async adminStats(_parent: unknown, _args: unknown, ctx: Context) {
      requireAuth(ctx);
      requirePermission(ctx, "audit:read");

      const totalInterviews = await InterviewModel.countDocuments();
      const interviews = await InterviewModel.find().lean();
      const totalScore = interviews.reduce((sum, i) => sum + (i.score || 0), 0);
      const avgScore = interviews.length > 0 ? totalScore / interviews.length : 0;

      // Distinct user count from UserRole
      const totalUsers = await UserRoleModel.countDocuments();

      // Active today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeToday = await InterviewModel.countDocuments({
        createdAt: { $gte: today },
      });

      return {
        totalUsers,
        totalInterviews,
        totalResumes: 0,
        avgScore: Math.round(avgScore * 100) / 100,
        activeToday,
        topLanguages: [],
      };
    },

    async auditLogs(
      _parent: unknown,
      {
        limit = 50,
        offset = 0,
        userId,
        resource,
      }: { limit: number; offset: number; userId?: string; resource?: string },
      ctx: Context,
    ) {
      requireAuth(ctx);
      requirePermission(ctx, "audit:read");

      const filter: Record<string, unknown> = {};
      if (userId) filter.userId = userId;
      if (resource) filter.resource = resource;

      const [items, total] = await Promise.all([
        AuditLogModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        AuditLogModel.countDocuments(filter),
      ]);

      return {
        items: items.map((i: any) => ({
          id: i._id?.toString?.() || String(i._id),
          ...i,
          createdAt: i.createdAt?.toISOString?.() || i.createdAt,
        })),
        total,
        hasMore: offset + items.length < total,
      };
    },
  },

  Mutation: {
    async registerWebhook(
      _parent: unknown,
      { url, events, secret }: { url: string; events: string[]; secret?: string },
      ctx: Context,
    ) {
      requireAuth(ctx);
      requirePermission(ctx, "admin:webhook");

      const webhook = await WebhookModel.create({
        userId: ctx.userId,
        url,
        events,
        secret: secret || null,
        active: true,
      });

      return {
        id: webhook._id.toString(),
        url,
        events,
        active: true,
        createdAt: webhook.createdAt?.toISOString?.() || new Date().toISOString(),
      };
    },

    async deleteWebhook(_parent: unknown, { id }: { id: string }, ctx: Context) {
      requireAuth(ctx);
      requirePermission(ctx, "admin:webhook");
      await WebhookModel.deleteOne({ _id: id, userId: ctx.userId });
      return true;
    },

    async updateUserRole(
      _parent: unknown,
      { userId, role }: { userId: string; role: string },
      ctx: Context,
    ) {
      requireAuth(ctx);
      requirePermission(ctx, "admin:role");

      const validRoles = ["candidate", "interviewer", "admin"];
      if (!validRoles.includes(role)) {
        throw new GraphQLError("Invalid role", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      await UserRoleModel.findOneAndUpdate(
        { userId },
        { role, assignedBy: ctx.userId, assignedAt: new Date() },
        { upsert: true, new: true },
      );

      return {
        userId,
        role,
        assignedAt: new Date().toISOString(),
      };
    },
  },
};
