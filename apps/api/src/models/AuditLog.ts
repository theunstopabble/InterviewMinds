import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["candidate", "interviewer", "admin"],
      required: true,
    },

    // What was done
    action: {
      type: String,
      required: true,
      index: true,
    }, // e.g. "POST /api/interview/end"
    resource: {
      type: String,
      required: true,
      index: true,
    }, // e.g. "interview", "resume", "user"
    resourceId: {
      type: String,
      default: null,
    }, // MongoDB _id of affected document

    // Outcome
    status: {
      type: String,
      enum: ["success", "failure", "denied"],
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },

    // Request context
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    correlationId: {
      type: String,
      default: null,
    },

    // Optional metadata (sanitized — no passwords, tokens, PII)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for fast filtering
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model("AuditLog", auditLogSchema);
