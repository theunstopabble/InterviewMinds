import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { UserRoleModel } from "./models/Role";
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
import { initializeDefaultPlanLimits } from "./lib/multiTenancy";
import jobMatchingRoutes from "./routes/jobMatching";
import questionGenerationRoutes from "./routes/questionGeneration";
import codeAnalysisRoutes from "./routes/codeAnalysis";
import e2eEncryptionRoutes from "./routes/e2eEncryption";
import biometricAuthRoutes from "./routes/biometricAuth";
import atsIntegrationRoutes from "./routes/atsIntegration";
import analyticsRoutes from "./routes/analytics";
import complianceRoutes from "./routes/compliance";
import integrationRoutes from "./routes/integration";
import mobileRoutes from "./routes/mobile";
import observabilityRoutes from "./routes/observability";
import agentRoutes from "./routes/agent";
import chatRoutes from "./routes/chat";
import interviewRoutes from "./routes/interview";
import feedbackRoutes from "./routes/feedback";
import { requireAuth } from "./middleware/auth";
import compilerRoutes from "./routes/compiler";
import ttsRoutes from "./routes/tts";
import codeEvaluationRoutes from "./routes/codeEvaluation";
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
  authLimiter,
  uploadLimiter,
  requestTimeout,
  sanitizeInput,
  getCsrfToken,
  graphqlLimiter,
} from "./lib/security";
import mongoSanitize from "express-mongo-sanitize";
import { getCircuitBreakersHealth } from "./lib/circuitBreaker";
import { attachRole } from "./middleware/rbac";
import { auditLog } from "./middleware/audit";
import { metricsMiddleware, register } from "./lib/metrics";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import adminRoutes from "./routes/admin";
import exportRoutes from "./routes/export";
import reportRoutes from "./routes/reports";
import userRoutes from "./routes/users";
import schedulingRoutes from "./routes/scheduling";
import llmInterviewerRoutes from "./routes/llmInterviewer";
import multimodalAIRoutes from "./routes/multimodalAI";
import smartAssessmentRoutes from "./routes/smartAssessment";
import notificationRoutes from "./routes/notifications";
import infrastructureRoutes from "./routes/infrastructure";
import collaborationRoutes from "./routes/collaboration";
import developerRoutes from "./routes/developer";
import { startWorkers, closeQueues } from "./lib/queue";
import { requireEnvVars } from "./lib/envValidation";
import { notificationService } from './lib/notifications';
import { ScheduledInterviewModel } from './models/Scheduling';
import { AgentConfigModel } from "./models/AgentConfig";
import { AutomationModel } from "./models/Automation";

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

app.use(express.json({ limit: "1mb" }));

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
app.use(mongoSanitize());

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

// Ping endpoint
app.get("/ping", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Admin setup endpoint — requires authentication + existing admin role
app.get("/api/admin/setup-admin", requireAuth, async (req: any, res: Response) => {
  try {
    const requestingUserId = req.auth?.userId;
    if (!requestingUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const requestingUser = await UserRoleModel.findOne({ userId: requestingUserId });
    if (!requestingUser || requestingUser.role !== "admin") {
      res.status(403).json({ error: "Admin privileges required" });
      return;
    }
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    const role = await UserRoleModel.findOneAndUpdate(
      { userId },
      { role: "admin", assignedBy: `admin:${requestingUserId}`, assignedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, role });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "Failed to set admin");
    res.status(500).json({ error: "Failed to set admin" });
  }
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
  authLimiter,
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
  "/api/job-matching",
  requireAuth,
  attachRole,
  jobMatchingRoutes,
);

app.use(
  "/api/questions",
  requireAuth,
  attachRole,
  questionGenerationRoutes,
);

import questionBankRoutes from "./routes/questionBank";
import { seedDefaultCategories } from "./lib/questionBank";
app.use(
  "/api/question-bank",
  requireAuth,
  attachRole,
  questionBankRoutes,
);

app.use(
  "/api/code-analysis",
  requireAuth,
  attachRole,
  codeAnalysisRoutes,
);

app.use(
  "/api/e2e-encryption",
  requireAuth,
  attachRole,
  e2eEncryptionRoutes,
);

app.use(
  "/api/biometric",
  requireAuth,
  attachRole,
  biometricAuthRoutes,
);

app.use(
  "/api/ats",
  requireAuth,
  attachRole,
  atsIntegrationRoutes,
);

app.use(
  "/api/scheduling",
  schedulingRoutes,
);

// Phase 9: Next-Gen AI & LLM Features
app.use(
  "/api/llm-interviewer",
  requireAuth,
  attachRole,
  aiLimiter,
  auditLog("llm-interviewer"),
  llmInterviewerRoutes,
);

app.use(
  "/api/multimodal-ai",
  requireAuth,
  attachRole,
  auditLog("multimodal-ai"),
  multimodalAIRoutes,
);

app.use(
  "/api/smart-assessment",
  requireAuth,
  attachRole,
  aiLimiter,
  auditLog("smart-assessment"),
  smartAssessmentRoutes,
);

// Phase 10: Cloud-Native & Infrastructure
app.use(
  "/api/infrastructure",
  requireAuth,
  attachRole,
  infrastructureRoutes,
);

// Notifications API
app.use(
  "/api/notifications",
  requireAuth,
  attachRole,
  notificationRoutes,
);

// Phase 11: Real-Time Collaboration
app.use(
  "/api/collaboration",
  requireAuth,
  attachRole,
  collaborationRoutes,
);

// Phase 12: Advanced Analytics
app.use(
  "/api/analytics",
  requireAuth,
  attachRole,
  analyticsRoutes,
);

// Phase 13: Developer Experience
app.use(
  "/api/developer",
  requireAuth,
  attachRole,
  developerRoutes,
);

// Phase 14: Compliance & Governance
app.use(
  "/api/compliance",
  requireAuth,
  attachRole,
  complianceRoutes,
);

// Phase 15: Integration Ecosystem
app.use(
  "/api/integration",
  requireAuth,
  attachRole,
  integrationRoutes,
);

// Phase 16: Mobile & Multi-Platform
app.use(
  "/api/mobile",
  requireAuth,
  attachRole,
  mobileRoutes,
);

// Phase 17: Observability & DevOps
app.use(
  "/api/observability",
  requireAuth,
  attachRole,
  observabilityRoutes,
);

// Phase 18: AI Agent & Automation
app.use(
  "/api/agent",
  requireAuth,
  attachRole,
  agentRoutes,
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
  "/api/feedback",
  requireAuth,
  feedbackRoutes,
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
app.use(
  "/api/code-evaluation",
  requireAuth,
  attachRole,
  aiLimiter,
  auditLog("code-evaluation"),
  codeEvaluationRoutes,
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

app.use(
  "/api/reports",
  requireAuth,
  reportRoutes,
);

// 13. User Routes
app.use(
  "/api/users",
  requireAuth,
  userRoutes,
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
      context: async ({ req }: { req: unknown }) => {
        const r = req as { auth?: { userId?: string }; userRole?: string };
        const userId = r.auth?.userId || "";
        const userRole: "candidate" | "interviewer" | "admin" = (r.userRole as "candidate" | "interviewer" | "admin") || "candidate";
        return { userId, userRole };
      },
    }),
  );
})().catch((err: Error) => {
  logger.error({ err: err.message }, "Apollo Server startup failed");
});

// 13. Global Error Handler (must be last)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
  if (err.message && err.message.startsWith("CORS policy")) {
    return res.status(403).json({ error: "CORS Forbidden", details: err.message });
  }
  logger.error({ err: err.message, stack: err.stack }, "unhandled error");
  captureException(err, { path: _req.path, method: _req.method });
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
    .then(async () => {
      logger.info("MongoDB connected");
      await initializeDefaultPlanLimits();
      await seedDefaultCategories();

      // Seed default agents if empty
      AgentConfigModel.countDocuments().then(count => {
        if (count === 0) {
          AgentConfigModel.create([
            { name: "Resume Screening Agent", type: "screening", model: "llama-3.3-70b-versatile", temperature: 0.3, maxTokens: 1024, systemPrompt: "You are an expert technical recruiter.", tools: ["score.resume", "shortlist.candidate"], isActive: true, createdBy: "system" },
            { name: "Scheduling Agent", type: "scheduling", model: "llama-3.3-70b-versatile", temperature: 0.2, maxTokens: 256, systemPrompt: "You are an interview scheduler.", tools: ["find.slot", "send.invite"], isActive: true, createdBy: "system" },
            { name: "Feedback Agent", type: "feedback", model: "llama-3.3-70b-versatile", temperature: 0.4, maxTokens: 1200, systemPrompt: "You are a senior engineering manager giving feedback.", tools: ["analyze.responses", "generate.feedback"], isActive: true, createdBy: "system" },
          ]);
        }
      }).catch(e => logger.error({ err: e }, 'Failed to seed agents'));

      // Seed default automations if empty
      AutomationModel.countDocuments().then(count => {
        if (count === 0) {
          AutomationModel.create([
            { name: "Candidate Follow-up", description: "Send follow-up email after interview", trigger: "interview_completed", triggerConfig: {}, actions: [{ type: "custom", config: { actionType: "delay", minutes: 60 } }, { type: "email", config: { template: "interview_followup" } }], isActive: true, runCount: 0, createdBy: "system" },
            { name: "Interview Reminder", description: "Send reminder before interview", trigger: "schedule_reminder", triggerConfig: {}, actions: [{ type: "custom", config: { actionType: "delay", minutes: 30 } }, { type: "notification", config: { type: "reminder" } }], isActive: true, runCount: 0, createdBy: "system" },
          ]);
        }
      }).catch(e => logger.error({ err: e }, 'Failed to seed automations'));

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
  createSocketServer(httpServer, allowedOrigins);
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || "development" }, "server started with Socket.IO");
  });

  // ─── Interview Reminder (every 15 minutes) ─────────────────────────
  setInterval(async () => {
    try {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      const upcoming = await ScheduledInterviewModel.find({
        status: 'scheduled',
        reminderSent: false,
        scheduledTime: { $gte: now, $lte: inOneHour },
      }).lean();

      for (const interview of upcoming) {
        notificationService.sendTemplatedNotification(
          interview.candidateId,
          'interview-reminder',
          {
            candidate_name: interview.candidateId,
            role: interview.role,
            interview_time: interview.scheduledTime.toLocaleTimeString('en-US'),
            interview_link: interview.meetingLink || 'https://interviewminds.com/interview',
          }
        ).catch((err) => {
          logger.error({ err, interviewId: interview.id }, 'Failed to send interview reminder');
        });

        await ScheduledInterviewModel.updateOne(
          { id: interview.id },
          { $set: { reminderSent: true } }
        );
      }

      if (upcoming.length > 0) {
        logger.info({ sent: upcoming.length }, 'Interview reminders dispatched');
      }
    } catch (err) {
      logger.error({ err }, 'Interview reminder check failed');
    }
  }, 15 * 60 * 1000);
}

// 17. Export App
export default app;
