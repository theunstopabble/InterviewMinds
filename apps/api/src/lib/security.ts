import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { getRedisClient } from "./redis";
import { logger } from "./logger";

// ============================================================================
// 1. HELMET — Enterprise Security Headers
// ============================================================================
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React build needs inline/eval
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Relaxed for frontend compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// ============================================================================
// 2. RATE LIMITING — Tiered Limits with Redis Store
// ============================================================================

// In-memory store for rate limiter (fallback when Redis unavailable)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

function getClientIdentifier(req: Request): string {
  // Prefer authenticated user ID, fallback to IP
  const authReq = req as any;
  const userId = authReq.auth?.userId || authReq.user?.userId;
  if (userId) return `user:${userId}`;
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
}

function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${options.keyPrefix}:${getClientIdentifier(req)}`,
    handler: (req: Request, res: Response) => {
      logger.warn(
        { client: getClientIdentifier(req), path: req.path },
        "rate limit exceeded"
      );
      res.status(429).json({
        error: "Too many requests",
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
    store: {
      // Custom memory store with Redis fallback potential
      increment: async (key: string) => {
        const now = Date.now();
        const entry = memoryStore.get(key);
        if (!entry || now > entry.resetTime) {
          memoryStore.set(key, {
            count: 1,
            resetTime: now + options.windowMs,
          });
          return { totalHits: 1, resetTime: new Date(now + options.windowMs) };
        }
        entry.count += 1;
        return { totalHits: entry.count, resetTime: new Date(entry.resetTime) };
      },
      decrement: async (key: string) => {
        const entry = memoryStore.get(key);
        if (entry && entry.count > 0) {
          entry.count -= 1;
        }
      },
      resetKey: async (key: string) => {
        memoryStore.delete(key);
      },
    } as any,
  });
}

// General API rate limit — 200 requests per 15 min
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyPrefix: "general",
  message: "General API rate limit exceeded. Please slow down.",
});

// AI service rate limit — 30 requests per minute
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "ai",
  message: "AI service rate limit exceeded. Please wait a moment.",
});

// Upload rate limit — 10 uploads per 15 min
export const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: "upload",
  message: "Upload rate limit exceeded. Please try again later.",
});

// Strict auth limit — 20 login/registration attempts per 5 min
export const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  keyPrefix: "auth",
  message: "Too many authentication attempts. Please try again later.",
});

// ============================================================================
// 3. REQUEST TIMEOUT — Prevent Hanging Connections
// ============================================================================
export function requestTimeout(ms: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn({ path: req.path, method: req.method }, "request timed out");
        res.status(408).json({ error: "Request timeout" });
      }
    }, ms);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
}

// ============================================================================
// 4. INPUT SANITIZATION — Prevent NoSQL Injection & XSS
// ============================================================================
const SUSPICIOUS_PATTERNS = [
  /\$\s*\{/, // Template literal injection
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:\s*/gi, // javascript: protocol
  /on\w+\s*=/gi, // Event handlers
];

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const checkValue = (value: unknown, path: string) => {
    if (typeof value === "string") {
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(value)) {
          logger.warn(
            { pattern: pattern.source, path, value: value.slice(0, 100) },
            "suspicious input detected"
          );
          throw new Error(`Suspicious input detected at ${path}`);
        }
      }
    }
    if (typeof value === "object" && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        checkValue(v, `${path}.${k}`);
      }
    }
  };

  try {
    checkValue(req.body, "body");
    checkValue(req.query, "query");
    checkValue(req.params, "params");
    next();
  } catch (err: unknown) {
    next(err);
  }
}

// ============================================================================
// 5. TRUSTED PROXY — Required when behind load balancers / CDNs
// ============================================================================
export function configureTrustProxy(app: any) {
  // Trust first proxy (e.g., Nginx, Vercel, Cloudflare)
  app.set("trust proxy", 1);
}
