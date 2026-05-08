import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import resumeRoutes from "./routes/resume";
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
  authLimiter,
  requestTimeout,
  sanitizeInput,
} from "./lib/security";

dotenv.config();
initSentry();

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

// 2. Security Headers (Helmet)
app.use(securityHeaders);

// 3. Request Timeout (prevent hanging connections)
app.use(requestTimeout(30000));

// 4. Input Sanitization (prevent NoSQL injection & XSS payloads)
app.use(sanitizeInput);

// 5. Rate Limiters
app.use(generalLimiter);

// 6. Health Check (includes DB and Redis status)
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
  const healthy = mongoState === "connected" && redisState === "connected";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: { mongo: mongoState, redis: redisState },
  });
});

// 7. Root Route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "InterviewMinds Backend is Running!" });
});

// 8. Protected Routes
app.use("/api/resume", requireAuth, uploadLimiter, resumeRoutes);
app.use("/api/chat", requireAuth, aiLimiter, chatRoutes);
app.use("/api/interview", requireAuth, interviewRoutes);
app.use("/api/compiler", requireAuth, aiLimiter, compilerRoutes);
app.use("/api/tts", requireAuth, aiLimiter, ttsRoutes);

// 9. Global Error Handler (must be last)
app.use((err: Error, _req: Request, res: Response, _next: () => void) => {
  if (err.message && err.message.startsWith("CORS policy")) {
    return res.status(403).json({ error: "CORS Forbidden", details: err.message });
  }
  logger.error({ err: err.message, stack: err.stack }, "unhandled error");
  captureException(err, { path: (_req as any).path, method: _req.method });
  res.status(500).json({ error: "Internal Server Error" });
});

// 10. Database Connection
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
    .then(() => logger.info("MongoDB connected"))
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

// 11. Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await closeRedisClient();
  await mongoose.connection.close();
  logger.info("Connections closed");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await closeRedisClient();
  await mongoose.connection.close();
  logger.info("Connections closed");
  process.exit(0);
});

// 12. Start Server + Socket.IO
const httpServer = createServer(app);

if (require.main === module) {
  createSocketServer(httpServer, allowedOrigins);
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || "development" }, "server started with Socket.IO");
  });
}

// 13. Export App
export default app;
