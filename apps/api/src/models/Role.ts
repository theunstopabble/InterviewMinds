import mongoose from "mongoose";

export type RoleName = "candidate" | "interviewer" | "admin";

export const RolePermissions: Record<RoleName, string[]> = {
  candidate: [
    "resume:create",
    "resume:read_own",
    "resume:update_own",
    "resume:delete_own",
    "interview:start",
    "interview:end",
    "interview:read_own",
    "chat:send",
    "chat:read",
    "compiler:use",
    "tts:use",
  ],
  interviewer: [
    "resume:read_any",
    "interview:read_any",
    "interview:evaluate",
    "chat:send",
    "chat:read",
    "audit:read",
    "user:read",
  ],
  admin: [
    "*", // wildcard — all permissions
  ],
};

const roleSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["candidate", "interviewer", "admin"],
    default: "candidate",
    required: true,
  },
  assignedBy: {
    type: String,
    default: null, // Clerk userId of admin who assigned the role
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

roleSchema.index({ userId: 1, role: 1 });

export const UserRoleModel = mongoose.model("UserRole", roleSchema);

/**
 * Check if a role has a specific permission.
 * Admin wildcard "*" grants everything.
 */
export function hasPermission(roleName: RoleName, permission: string): boolean {
  const perms = RolePermissions[roleName] || [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}
