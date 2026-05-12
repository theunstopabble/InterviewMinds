import { logger } from "./logger";

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

const accessRequests: AccessRequest[] = [];
const permissionGroups: PermissionGroup[] = [
  {
    id: "group_1",
    name: "HR Admin",
    description: "Human resources administrators",
    permissions: ["candidate:read", "candidate:write", "report:read"],
    users: [],
    createdAt: new Date(),
  },
  {
    id: "group_2",
    name: "Technical Interviewer",
    description: "Technical interview team",
    permissions: ["interview:conduct", "candidate:read", "code:review"],
    users: [],
    createdAt: new Date(),
  },
];

export function createAccessRequest(request: {
  userId: string;
  userName: string;
  requestedPermission: string;
  justification: string;
  duration: "temporary" | "permanent";
  expiryDate?: Date;
}): AccessRequest {
  const approvalChain = getApprovalChain(request.requestedPermission);

  const newRequest: AccessRequest = {
    id: `req_${Date.now()}`,
    ...request,
    status: "pending",
    approvers: approvalChain.map((role, idx) => ({
      level: idx + 1,
      approverRole: role,
      status: "pending",
    })),
    createdAt: new Date(),
  };

  accessRequests.push(newRequest);
  logger.info(`Created access request: ${newRequest.id}`);

  return newRequest;
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

export function approveRequest(requestId: string, approverId: string, comment?: string): AccessRequest | null {
  const request = accessRequests.find(r => r.id === requestId);
  if (!request) return null;

  const currentStep = request.approvers.find(a => a.status === "pending");
  if (!currentStep) return null;

  currentStep.status = "approved";
  currentStep.approverId = approverId;
  currentStep.comment = comment;
  currentStep.timestamp = new Date();

  const allApproved = request.approvers.every(a => a.status === "approved");
  if (allApproved) {
    request.status = "approved";
    request.resolvedAt = new Date();
    request.resolvedBy = approverId;
    logger.info(`Access request ${requestId} approved`);
  }

  return request;
}

export function rejectRequest(requestId: string, approverId: string, comment: string): AccessRequest | null {
  const request = accessRequests.find(r => r.id === requestId);
  if (!request) return null;

  const currentStep = request.approvers.find(a => a.status === "pending");
  if (!currentStep) return null;

  currentStep.status = "rejected";
  currentStep.approverId = approverId;
  currentStep.comment = comment;
  currentStep.timestamp = new Date();

  request.status = "rejected";
  request.resolvedAt = new Date();
  request.resolvedBy = approverId;

  logger.info(`Access request ${requestId} rejected`);

  return request;
}

export function getUserRequests(userId: string): AccessRequest[] {
  return accessRequests.filter(r => r.userId === userId);
}

export function getPendingApprovals(approverId: string): AccessRequest[] {
  return accessRequests.filter(r =>
    r.status === "pending" &&
    r.approvers.some(a => a.status === "pending" && a.approverId === approverId)
  );
}

export function getAllPermissionGroups(): PermissionGroup[] {
  return permissionGroups;
}

export function createPermissionGroup(group: Omit<PermissionGroup, "id" | "createdAt">): PermissionGroup {
  const newGroup: PermissionGroup = {
    ...group,
    id: `group_${Date.now()}`,
    createdAt: new Date(),
  };
  permissionGroups.push(newGroup);
  logger.info(`Created permission group: ${newGroup.name}`);
  return newGroup;
}

export function addUserToGroup(groupId: string, userId: string): PermissionGroup | null {
  const group = permissionGroups.find(g => g.id === groupId);
  if (!group) return null;

  if (!group.users.includes(userId)) {
    group.users.push(userId);
    logger.info(`Added user ${userId} to group ${groupId}`);
  }

  return group;
}

export function removeUserFromGroup(groupId: string, userId: string): PermissionGroup | null {
  const group = permissionGroups.find(g => g.id === groupId);
  if (!group) return null;

  group.users = group.users.filter(u => u !== userId);
  logger.info(`Removed user ${userId} from group ${groupId}`);

  return group;
}

export function getUserPermissions(userId: string): string[] {
  const groups = permissionGroups.filter(g => g.users.includes(userId));
  const permissions = new Set<string>();

  groups.forEach(g => g.permissions.forEach(p => permissions.add(p)));

  return Array.from(permissions);
}