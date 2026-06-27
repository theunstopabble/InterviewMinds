import { logger } from "./logger";
import { AccessRequestModel } from "../models/AccessRequest";
import { PermissionGroupModel } from "../models/PermissionGroup";

export interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  requestedPermission: string;
  justification: string;
  duration: "temporary" | "permanent";
  expiryDate?: Date;
  status: "pending" | "approved" | "rejected" | "expired";
  approvers: ApprovalStep[];
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ApprovalStep {
  level: number;
  approverRole: string;
  approverId?: string;
  status: "pending" | "approved" | "rejected";
  comment?: string;
  timestamp?: Date;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  users: string[];
  createdAt: Date;
}

async function seedDefaultGroups(): Promise<void> {
  const count = await PermissionGroupModel.countDocuments();
  if (count > 0) return;

  await PermissionGroupModel.create([
    {
      name: "HR Admin",
      description: "Human resources administrators",
      permissions: ["candidate:read", "candidate:write", "report:read"],
      members: [],
    },
    {
      name: "Technical Interviewer",
      description: "Technical interview team",
      permissions: ["interview:conduct", "candidate:read", "code:review"],
      members: [],
    },
  ]);

  logger.info("Seeded default permission groups");
}

export async function createAccessRequest(request: {
  userId: string;
  userName: string;
  requestedPermission: string;
  justification: string;
  duration: "temporary" | "permanent";
  expiryDate?: Date;
}): Promise<AccessRequest> {
  const approvalChain = getApprovalChain(request.requestedPermission);

  const durationNum = request.duration === "permanent" ? 0 : request.expiryDate
    ? Math.ceil((new Date(request.expiryDate).getTime() - Date.now()) / 86400000)
    : 30;

  const doc = await AccessRequestModel.create({
    userId: request.userId,
    userName: request.userName,
    requestedPermission: request.requestedPermission,
    justification: request.justification,
    status: "pending",
    duration: durationNum,
    expiryDate: request.expiryDate,
  });

  logger.info(`Created access request: ${doc.id}`);

  return {
    id: doc.id,
    userId: doc.userId,
    userName: doc.userName || request.userName,
    requestedPermission: doc.requestedPermission,
    justification: doc.justification || request.justification,
    duration: doc.duration === 0 ? "permanent" : "temporary",
    expiryDate: doc.expiryDate || undefined,
    status: doc.status as AccessRequest["status"],
    approvers: approvalChain.map((role, idx) => ({
      level: idx + 1,
      approverRole: role,
      status: idx === 0 && doc.approverId ? "approved" : "pending",
      approverId: idx === 0 ? doc.approverId || undefined : undefined,
    })),
    createdAt: doc.createdAt,
    resolvedAt: undefined,
    resolvedBy: undefined,
  };
}

export function getApprovalChain(permission: string): string[] {
  const chains: Record<string, string[]> = {
    "candidate:delete": ["manager", "director"],
    "report:export": ["manager", "compliance"],
    "interview:delete": ["interviewer", "manager"],
    "user:create": ["admin"],
    "*:delete": ["director", "compliance"],
  };

  return chains[permission] || ["manager"];
}

export async function approveRequest(requestId: string, approverId: string, comment?: string): Promise<AccessRequest | null> {
  const doc = await AccessRequestModel.findOne({ id: requestId });
  if (!doc) return null;
  if (doc.status !== "pending") return null;

  doc.status = "approved";
  doc.approverId = approverId;
  doc.approverComment = comment || undefined;
  await doc.save();

  logger.info(`Access request ${requestId} approved`);

  return requestToInterface(doc);
}

export async function rejectRequest(requestId: string, approverId: string, comment: string): Promise<AccessRequest | null> {
  const doc = await AccessRequestModel.findOne({ id: requestId });
  if (!doc) return null;
  if (doc.status !== "pending") return null;

  doc.status = "rejected";
  doc.approverId = approverId;
  doc.approverComment = comment;
  await doc.save();

  logger.info(`Access request ${requestId} rejected`);

  return requestToInterface(doc);
}

function requestToInterface(doc: Record<string, any>): AccessRequest {
  return {
    id: doc.id,
    userId: doc.userId,
    userName: doc.userName || "",
    requestedPermission: doc.requestedPermission,
    justification: doc.justification || "",
    duration: doc.duration === 0 ? "permanent" : "temporary",
    expiryDate: doc.expiryDate || undefined,
    status: doc.status === "cancelled" ? "expired" : doc.status as AccessRequest["status"],
    approvers: [],
    createdAt: doc.createdAt,
    resolvedAt: doc.updatedAt,
    resolvedBy: doc.approverId || undefined,
  };
}

export async function getUserRequests(userId: string): Promise<AccessRequest[]> {
  const docs = await AccessRequestModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return docs.map(requestToInterface);
}

export async function getPendingApprovals(_approverId: string): Promise<AccessRequest[]> {
  const docs = await AccessRequestModel.find({ status: "pending" }).sort({ createdAt: -1 }).lean();
  return docs.map(requestToInterface);
}

export async function getAllPermissionGroups(): Promise<PermissionGroup[]> {
  const docs = await PermissionGroupModel.find().sort({ name: 1 }).lean();
  return docs.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description || "",
    permissions: g.permissions,
    users: g.members,
    createdAt: g.createdAt,
  }));
}

export async function createPermissionGroup(group: Omit<PermissionGroup, "id" | "createdAt">): Promise<PermissionGroup> {
  const doc = await PermissionGroupModel.create({
    name: group.name,
    description: group.description,
    permissions: group.permissions,
    members: group.users,
  });

  logger.info(`Created permission group: ${doc.name}`);

  return {
    id: doc.id,
    name: doc.name,
    description: doc.description || "",
    permissions: doc.permissions,
    users: doc.members,
    createdAt: doc.createdAt,
  };
}

export async function addUserToGroup(groupId: string, userId: string): Promise<PermissionGroup | null> {
  const doc = await PermissionGroupModel.findOneAndUpdate(
    { id: groupId },
    { $addToSet: { members: userId } },
    { new: true },
  ).lean();
  if (!doc) return null;

  logger.info(`Added user ${userId} to group ${groupId}`);

  return {
    id: doc.id,
    name: doc.name,
    description: doc.description || "",
    permissions: doc.permissions,
    users: doc.members,
    createdAt: doc.createdAt,
  };
}

export async function removeUserFromGroup(groupId: string, userId: string): Promise<PermissionGroup | null> {
  const doc = await PermissionGroupModel.findOneAndUpdate(
    { id: groupId },
    { $pull: { members: userId } },
    { new: true },
  ).lean();
  if (!doc) return null;

  logger.info(`Removed user ${userId} from group ${groupId}`);

  return {
    id: doc.id,
    name: doc.name,
    description: doc.description || "",
    permissions: doc.permissions,
    users: doc.members,
    createdAt: doc.createdAt,
  };
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const groups = await PermissionGroupModel.find({ members: userId }).lean();
  const permissions = new Set<string>();
  groups.forEach(g => g.permissions.forEach(p => permissions.add(p)));
  return Array.from(permissions);
}

seedDefaultGroups().catch(err => logger.error({ err }, "Failed to seed permission groups"));
