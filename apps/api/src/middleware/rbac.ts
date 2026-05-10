import { Request, Response, NextFunction } from "express";
import { UserRoleModel, hasPermission, RoleName } from "../models/Role";
import { logger } from "../lib/logger";

export interface RBACRequest extends Request {
  userRole?: RoleName;
  auth?: {
    userId?: string;
  };
}

/**
 * Middleware: attaches the user's role to `req.userRole`.
 * If no role record exists, defaults to "candidate".
 * Should run AFTER `requireAuth` so `req.auth.userId` is populated.
 */
export async function attachRole(
  req: RBACRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      (req as any).userRole = "candidate";
      return next();
    }

    const record = await UserRoleModel.findOne({ userId }).lean();
    req.userRole = (record?.role as RoleName) || "candidate";
    next();
  } catch (err: unknown) {
    logger.warn(
      { err: (err as Error).message, userId: (req as any).auth?.userId },
      "role lookup failed — defaulting to candidate",
    );
    req.userRole = "candidate";
    next();
  }
}

/**
 * Middleware factory: deny request if user lacks required permission.
 */
export function requirePermission(permission: string) {
  return (req: RBACRequest, res: Response, next: NextFunction) => {
    const role = req.userRole || "candidate";
    if (!hasPermission(role, permission)) {
      logger.warn(
        { userId: (req as any).auth?.userId, role, permission, path: req.path },
        "rbac denied",
      );
      return res.status(403).json({
        error: "Forbidden",
        message: `Role '${role}' does not have permission '${permission}'`,
      });
    }
    next();
  };
}

/**
 * Middleware factory: deny request if user is not one of the allowed roles.
 */
export function requireRole(...allowed: RoleName[]) {
  return (req: RBACRequest, res: Response, next: NextFunction) => {
    const role = req.userRole || "candidate";
    if (!allowed.includes(role)) {
      logger.warn(
        { userId: (req as any).auth?.userId, role, allowed, path: req.path },
        "role denied",
      );
      return res.status(403).json({
        error: "Forbidden",
        message: `Requires one of roles: ${allowed.join(", ")}`,
      });
    }
    next();
  };
}
