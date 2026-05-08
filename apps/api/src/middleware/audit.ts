import { Request, Response, NextFunction } from "express";
import { AuditLogModel } from "../models/AuditLog";
import { logger } from "../lib/logger";

interface AuditRequest extends Request {
  auditStartTime?: number;
}

/**
 * Middleware that records an audit log entry after the response finishes.
 * Attach this *after* auth + RBAC so userId & role are available.
 *
 * @param resource - logical resource name (e.g. "interview", "resume")
 * @param getResourceId - optional function to extract resourceId from req/res
 */
export function auditLog(
  resource: string,
  getResourceId?: (req: Request, res: Response) => string | null,
) {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    req.auditStartTime = Date.now();

    res.on("finish", async () => {
      try {
        const userId = (req as any).auth?.userId || "anonymous";
        const role = (req as any).userRole || "candidate";
        const action = `${req.method} ${req.path}`;
        const statusCode = res.statusCode;
        const status =
          statusCode >= 200 && statusCode < 400
            ? "success"
            : statusCode === 403
              ? "denied"
              : "failure";

        const metadata: Record<string, unknown> = {};
        // Sanitized metadata — never log tokens, passwords, or raw file buffers
        if (req.params && Object.keys(req.params).length) {
          metadata.params = req.params;
        }
        if (req.query && Object.keys(req.query).length) {
          metadata.query = req.query;
        }
        if (req.body && typeof req.body === "object") {
          const bodyKeys = Object.keys(req.body);
          if (bodyKeys.length > 0) {
            metadata.bodyKeys = bodyKeys;
          }
        }

        await AuditLogModel.create({
          userId,
          role,
          action,
          resource,
          resourceId: getResourceId ? getResourceId(req, res) : null,
          status,
          statusCode,
          ip: req.ip || (req as any).socket?.remoteAddress || null,
          userAgent: req.get("user-agent") || null,
          correlationId: (req as any).correlationId || null,
          metadata,
        });
      } catch (err: unknown) {
        // Audit failure must never crash the request
        logger.error(
          { err: (err as Error).message, path: req.path },
          "audit log write failed",
        );
      }
    });

    next();
  };
}

/**
 * Wrap an Express router with audit logging for all its routes.
 * Applies the same resource name to every route in the router.
 */
export function withAudit(
  router: any,
  resource: string,
  getResourceId?: (req: Request, res: Response) => string | null,
) {
  router.use(auditLog(resource, getResourceId));
  return router;
}
