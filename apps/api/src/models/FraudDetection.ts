import mongoose from "mongoose";

const fraudFlagSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "headless_browser",
        "virtual_machine",
        "screen_share",
        "multiple_accounts",
        "bot_detection",
        "ip_anomaly",
        "device_anomaly",
        "location_anomaly",
        "behavior_anomaly",
        "concurrent_sessions",
        "session_replay",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    description: { type: String, default: "" },
    evidence: { type: String, default: "" },
  },
  { _id: false },
);

const fraudDetectionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    riskScore: { type: Number, default: 0 },
    flags: [fraudFlagSchema],
    recommendations: [String],
    isTrusted: { type: Boolean, default: true },
    fingerprint: {
      userAgent: String,
      screen: {
        width: Number,
        height: Number,
      },
      timezone: String,
      language: String,
      platform: String,
      plugins: [String],
      canvasFingerprint: String,
      webglFingerprint: String,
    },
    behavior: {
      mouseMovements: [
        {
          x: Number,
          y: Number,
          timestamp: Number,
        },
      ],
      keystrokeTimings: [Number],
      scrollBehavior: {
        totalScrolls: Number,
        avgScrollDistance: Number,
        scrollSpeed: Number,
      },
      clickPattern: {
        totalClicks: Number,
        avgTimeBetweenClicks: Number,
      },
    },
    sessionMetrics: {
      ipAddress: String,
      ipChange: Boolean,
      deviceChange: Boolean,
      locationChange: Boolean,
      concurrentSessions: Number,
      sessionStartTime: Number,
    },
  },
  { timestamps: true },
);

fraudDetectionSchema.index({ sessionId: 1, createdAt: -1 });
fraudDetectionSchema.index({ userId: 1, riskScore: -1 });

export const FraudDetectionModel = mongoose.model(
  "FraudDetection",
  fraudDetectionSchema,
);
