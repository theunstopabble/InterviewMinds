import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getRedisClient } from "./redis";
import { logger } from "./logger";

// ============================================================================
// 1. HELMET — Enterprise Security Headers with CSP Nonce
// ============================================================================
const generateNonce = (): string => {
  return crypto.randomBytes(32).toString("base64");
};

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'nonce-INLINE-SCRIPT-NONCE'",
        "'strict-dynamic'",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://api.groq.io",
        "https://generativelanguage.googleapis.com",
        "https://*.onrender.com",
        "https://interviewminds.onrender.com",
      ],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
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

// Middleware to add CSP nonce to requests
export const cspNonceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.locals.nonce = generateNonce();
  next();
};

// ============================================================================
// 2. CSRF PROTECTION
// ============================================================================
const CSRF_TOKEN_LENGTH = 32;

function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

// Store CSRF tokens in memory (in production, use Redis)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip for API routes with token auth (Clerk handles this)
  const authHeader = req.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  const csrfToken = req.get("x-csrf-token") || req.body?._csrf;
  const sessionId = req.ip + ":" + (req.get("user-agent") || "").slice(0, 50);

  if (!csrfToken) {
    logger.warn({ path: req.path, ip: req.ip }, "CSRF token missing");
    return res.status(403).json({ error: "CSRF token required" });
  }

  const stored = csrfTokens.get(sessionId);
  if (!stored || stored.token !== csrfToken || Date.now() > stored.expiresAt) {
    logger.warn({ path: req.path, ip: req.ip }, "CSRF token invalid or expired");
    return res.status(403).json({ error: "CSRF token invalid or expired" });
  }

  // Regenerate token after successful validation
  const newToken = generateCsrfToken();
  csrfTokens.set(sessionId, {
    token: newToken,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  res.setHeader("x-csrf-token", newToken);
  next();
};

// Endpoint to get CSRF token
export const getCsrfToken = (_req: Request, res: Response) => {
  const sessionId = _req.ip + ":" + (_req.get("user-agent") || "").slice(0, 50);
  const token = generateCsrfToken();
  csrfTokens.set(sessionId, {
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  res.setHeader("x-csrf-token", token);
  res.json({ csrfToken: token });
};

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

// ============================================================================
// 2. RATE LIMITING — Tiered Limits with Redis Store
// ============================================================================

// Redis-backed rate limiter with memory fallback
interface RateLimitStore {
  increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}

// Redis store implementation
class RedisRateLimitStore implements RateLimitStore {
  private prefix: string;
  private windowMs: number;

  constructor(prefix: string, windowMs: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    try {
      const redis = getRedisClient();
      const redisKey = `ratelimit:${this.prefix}:${key}`;
      const ttl = Math.ceil(this.windowMs / 1000);

      const result = await redis
        .multi()
        .incr(redisKey)
        .expire(redisKey, ttl)
        .exec();

      if (!result || !result[0]) {
        throw new Error("Redis result is null");
      }

      const totalHits = result[0][1] as number;
      const resetTime = new Date(Date.now() + this.windowMs);

      return { totalHits, resetTime };
    } catch (error) {
      logger.warn({ err: (error as Error).message }, "Redis rate limit failed, using memory");
      return memoryStore.increment(key, this.windowMs);
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const redisKey = `ratelimit:${this.prefix}:${key}`;
      await redis.decr(redisKey);
    } catch {
      memoryStore.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const redisKey = `ratelimit:${this.prefix}:${key}`;
      await redis.del(redisKey);
    } catch {
      memoryStore.resetKey(key);
    }
  }
}

// In-memory store for rate limiter (fallback when Redis unavailable)
const memoryStore = {
  store: new Map<string, { count: number; resetTime: number }>(),

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const entry = memoryStore.store.get(key);
    if (!entry || now > entry.resetTime) {
      memoryStore.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { totalHits: 1, resetTime: new Date(now + windowMs) };
    }
    entry.count += 1;
    return { totalHits: entry.count, resetTime: new Date(entry.resetTime) };
  },

  async decrement(key: string) {
    const entry = memoryStore.store.get(key);
    if (entry && entry.count > 0) {
      entry.count -= 1;
    }
  },

  async resetKey(key: string) {
    memoryStore.store.delete(key);
  },
};

function getClientIdentifier(req: Request): string {
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
  const redisStore = new RedisRateLimitStore(options.keyPrefix, options.windowMs);
  const isRedisAvailable = process.env.REDIS_URL !== undefined;

  const memoryStoreInstance = {
    ...memoryStore,
    prefix: options.keyPrefix,
  };

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
    store: isRedisAvailable ? redisStore as any : memoryStoreInstance as any,
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

// GraphQL rate limit — 100 requests per minute (stricter for complex queries)
export const graphqlLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyPrefix: "graphql",
  message: "GraphQL rate limit exceeded. Please reduce query complexity.",
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
