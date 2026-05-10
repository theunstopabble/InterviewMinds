import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import resumeRoutes from "./routes/resume";
import resumeVerificationRoutes from "./routes/resumeVerification";
import answerValidationRoutes from "./routes/answerValidation";
import dynamicQuestionsRoutes from "./routes/dynamicQuestions";
import fraudDetectionRoutes from "./routes/fraudDetection";
import geoFencingRoutes from "./routes/geoFencing";
import videoProctoringRoutes from "./routes/videoProctoring";
import ssoIntegrationRoutes from "./routes/ssoIntegration";
import webhooksRoutes from "./routes/webhooks";
import multiTenancyRoutes from "./routes/multiTenancy";
import jobMatchingRoutes from "./routes/jobMatching";
import questionGenerationRoutes from "./routes/questionGeneration";
import codeAnalysisRoutes from "./routes/codeAnalysis";
import e2eEncryptionRoutes from "./routes/e2eEncryption";
import biometricAuthRoutes from "./routes/biometricAuth";
import atsIntegrationRoutes from "./routes/atsIntegration";
import analyticsRoutes from "./routes/analytics";
import complianceRoutes from "./routes/compliance";
import chatRoutes from "./routes/chat";
import interviewRoutes from "./routes/interview";
import { requireAuth } from "./middleware/auth";
import compilerRoutes from "./routes/compiler";
import ttsRoutes from "./routes/tts";
import { logger } from "./lib/logger";
import { correlationMiddleware, CorrelatedRequest } from "./lib/correlation";
import { getRedisClient, closeRedisClient } from "./lib/redis";
import { initSentry, captureException } from "./lib/sentry";
import { createSocketServer } from "./lib/socket";
import {
  securityHeaders,
  configureTrustProxy,
  generalLimiter,
  aiLimiter,
  uploadLimiter,
  requestTimeout,
  sanitizeInput,
  getCsrfToken,
  graphqlLimiter,
} from "./lib/security";
import { getCircuitBreakersHealth } from "./lib/circuitBreaker";
import { attachRole } from "./middleware/rbac";
import { auditLog } from "./middleware/audit";
import { metricsMiddleware, register } from "./lib/metrics";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import adminRoutes from "./routes/admin";
import exportRoutes from "./routes/export";
import { startWorkers, closeQueues } from "./lib/queue";
import { requireEnvVars } from "./lib/envValidation";

dotenv.config();
initSentry();
requireEnvVars();

// ─── Apollo Server (GraphQL) ───────────────────────────────────────────────
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV === "development",
});

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || "";

// 👇 CORS: Environment-driven whitelist
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin ${origin} not allowed`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

// Correlation ID middleware (must be early for request tracing)
app.use(correlationMiddleware);

// Request logging middleware
app.use((req: Request, res: Response, next: () => void) => {
  const start = Date.now();
  const cReq = req as CorrelatedRequest;
  const requestLogger = logger.child({
    correlationId: cReq.correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.get("user-agent"),
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    requestLogger.info({
      statusCode: res.statusCode,
      durationMs: duration,
    }, "request completed");
  });

  next();
});

// Trust proxy for accurate client IP behind load balancers
configureTrustProxy(app);

// 2. Prometheus Metrics — record duration/counters for all requests
app.use(metricsMiddleware);

// 3. Security Headers (Helmet)
app.use(securityHeaders);

// 4. Request Timeout (prevent hanging connections)
app.use(requestTimeout(30000));

// 5. Input Sanitization (prevent NoSQL injection & XSS payloads)
app.use(sanitizeInput);

// 6. Rate Limiters
app.use(generalLimiter);

// 7. Metrics Endpoint (Prometheus exposition format)
app.get("/metrics", async (_req: Request, res: Response) => {
  try {
    res.setHeader("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.status(200).send(metrics);
  } catch (err: unknown) {
    logger.error({ err: (err as Error).message }, "metrics collection failed");
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

// 8. CSRF Token Endpoint
app.get("/api/csrf", getCsrfToken);

// 9. Health Check (includes DB, Redis, external services, and circuit breakers)
app.get("/health", async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  let redisState = "unknown";
  try {
    const redis = getRedisClient();
    await redis.ping();
    redisState = "connected";
  } catch {
    redisState = "disconnected";
  }

  // Check external AI service (Groq) via a lightweight HEAD request to the API
  let groqState = "unknown";
  try {
    const axios = (await import("axios")).default;
    await axios.head("https://api.groq.com/openai/v1/models", { timeout: 5000 });
    groqState = "connected";
  } catch {
    groqState = "unreachable";
  }

  // Check external compiler service (Piston)
  let pistonState = "unknown";
  try {
    const axios = (await import("axios")).default;
    await axios.get("https://emkc.org/api/v2/piston/runtimes", { timeout: 5000 });
    pistonState = "connected";
  } catch {
    pistonState = "unreachable";
  }

  const criticalHealthy = mongoState === "connected";
  const fullyHealthy =
    criticalHealthy &&
    redisState === "connected" &&
    groqState === "connected";

  res.status(fullyHealthy ? 200 : criticalHealthy ? 200 : 503).json({
    status: fullyHealthy ? "ok" : criticalHealthy ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    services: {
      mongo: mongoState,
      redis: redisState,
      groq: groqState,
      piston: pistonState,
    },
    circuitBreakers: getCircuitBreakersHealth(),
  });
});

// 9. Root Route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "InterviewMinds Backend is Running!" });
});

// 10. Protected Routes (RBAC + Audit)
// attachRole must run after requireAuth so req.auth.userId is populated

app.use(
  "/api/resume",
  requireAuth,
  attachRole,
  uploadLimiter,
  auditLog("resume"),
  resumeRoutes,
);

app.use(
  "/api/resume",
  requireAuth,
  attachRole,
  auditLog("resume-verification"),
  resumeVerificationRoutes,
);

app.use(
  "/api/answer-validation",
  requireAuth,
  attachRole,
  auditLog("answer-validation"),
  answerValidationRoutes,
);

app.use(
  "/api/dynamic-questions",
  requireAuth,
  attachRole,
  auditLog("dynamic-questions"),
  dynamicQuestionsRoutes,
);

app.use(
  "/api/fraud-detection",
  requireAuth,
  attachRole,
  auditLog("fraud-detection"),
  fraudDetectionRoutes,
);

app.use(
  "/api/geo-fencing",
  requireAuth,
  attachRole,
  auditLog("geo-fencing"),
  geoFencingRoutes,
);

app.use(
  "/api/proctoring",
  requireAuth,
  attachRole,
  auditLog("proctoring"),
  videoProctoringRoutes,
);

app.use(
  "/api/sso",
  ssoIntegrationRoutes,
);

app.use(
  "/api/webhooks",
  webhooksRoutes,
);

app.use(
  "/api/tenants",
  multiTenancyRoutes,
);

app.use(
  "/api/compliance",
  complianceRoutes,
);

app.use(
  "/api/job-matching",
  jobMatchingRoutes,
);

app.use(
  "/api/questions",
  questionGenerationRoutes,
);

app.use(
  "/api/code-analysis",
  codeAnalysisRoutes,
);

app.use(
  "/api/e2e-encryption",
  e2eEncryptionRoutes,
);

app.use(
  "/api/biometric",
  biometricAuthRoutes,
);

app.use(
  "/api/ats",
  atsIntegrationRoutes,
);

app.use(
  "/api/analytics",
  analyticsRoutes,
);
app.use(
  "/api/chat",
  requireAuth,
  attachRole,
  aiLimiter,
  auditLog("chat"),
  chatRoutes,
);
app.use(
  "/api/interview",
  requireAuth,
  attachRole,
  auditLog("interview"),
  interviewRoutes,
);
app.use(
  "/api/compiler",
  requireAuth,
  attachRole,
  aiLimiter,
  auditLog("compiler"),
  compilerRoutes,
);
app.use(
  "/api/tts",
  requireAuth,
  attachRole,
  aiLimiter,
  auditLog("tts"),
  ttsRoutes,
);

// 11. Admin & Export Routes (require admin/auditor permissions)
app.use(
  "/api/admin",
  requireAuth,
  attachRole,
  adminRoutes,
);
app.use(
  "/api/export",
  requireAuth,
  attachRole,
  exportRoutes,
);

// 12. GraphQL Endpoint (Apollo Server)
// Mounted after all REST routes; requires auth via context
(async () => {
  await apolloServer.start();
  const { expressMiddleware } = await import("@apollo/server/express4");
  app.use(
    "/graphql",
    graphqlLimiter,
    expressMiddleware(apolloServer, {
      context: async ({ req }: { req: any }) => {
        const userId = req.auth?.userId || null;
        const userRole = req.userRole || "candidate";
        return { userId, userRole };
      },
    }),
  );
})().catch((err: Error) => {
  logger.error({ err: err.message }, "Apollo Server startup failed");
});

// 13. Global Error Handler (must be last)
app.use((err: Error, _req: Request, res: Response, _next: () => void) => {
  if (err.message && err.message.startsWith("CORS policy")) {
    return res.status(403).json({ error: "CORS Forbidden", details: err.message });
  }
  logger.error({ err: err.message, stack: err.stack }, "unhandled error");
  captureException(err, { path: (_req as any).path, method: _req.method });
  res.status(500).json({ error: "Internal Server Error" });
});

// 14. Database Connection
if (!MONGO_URI) {
  logger.fatal("MONGO_URI is missing in .env file");
  process.exit(1);
} else {
  mongoose
    .connect(MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    })
    .then(() => {
      logger.info("MongoDB connected");
      // Start background job workers after DB is ready
      try {
        startWorkers();
      } catch (err: unknown) {
        logger.error({ err: (err as Error).message }, "BullMQ worker startup failed");
      }
    })
    .catch((err: Error) => {
      logger.fatal({ err: err.message }, "MongoDB connection failed");
      process.exit(1);
    });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
  });
}

// 15. Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await closeQueues();
  await closeRedisClient();
  await mongoose.connection.close();
  logger.info("Connections closed");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeQueues();
  await closeRedisClient();
  await mongoose.connection.close();
  logger.info("Connections closed");
  process.exit(0);
});

// 16. Start Server + Socket.IO
const httpServer = createServer(app);

if (require.main === module) {
  const io = createSocketServer(httpServer, allowedOrigins);
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || "development" }, "server started with Socket.IO");
  });
}

// 17. Export App
export default app;
