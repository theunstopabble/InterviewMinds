import mongoose from "mongoose";

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "no_face",
        "multiple_faces",
        "face_occluded",
        "looking_away",
        "phone_detected",
        "person_entered",
        "multiple_voices",
        "tab_switch",
        "focus_loss",
        "screen_recording",
        "dev_tools_open",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    timestamp: { type: Number, required: true },
    duration: Number,
    evidence: { type: String, default: "" },
  },
  { _id: false },
);

const proctoringSessionSchema = new mongoose.Schema(
  {
    interviewId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "terminated"],
      default: "active",
    },
    startTime: { type: Number, default: Date.now },
    endTime: { type: Number, default: null },
    violations: [violationSchema],
    riskScore: { type: Number, default: 0 },
    metricsSummary: {
      totalFacePresentTime: { type: Number, default: 0 },
      averageEyeContact: { type: Number, default: 0 },
      tabSwitchCount: { type: Number, default: 0 },
      audioQuality: { type: Number, default: 0 },
    },
    recommendation: {
      type: String,
      enum: ["pass", "review", "flag", "terminate"],
      default: "pass",
    },
    videoMetrics: [
      {
        timestamp: Number,
        faceDetection: {
          present: Boolean,
          faceCount: Number,
          position: {
            x: Number,
            y: Number,
            z: Number,
          },
          lighting: String,
          occlusion: Boolean,
          confidence: Number,
        },
        eyeTracking: {
          gazeDirection: String,
          blinkRate: Number,
          eyeContactPercentage: Number,
          lookingAwayEvents: Number,
        },
        expressions: mongoose.Schema.Types.Mixed,
        presence: {
          personCount: Number,
          leavingFrame: Boolean,
          objectDetection: [String],
          multipleFaces: Boolean,
        },
      },
    ],
    audioMetrics: [
      {
        timestamp: Number,
        audio: {
          transcript: String,
          confidence: Number,
          language: String,
          voiceCount: Number,
          backgroundSounds: [String],
          fillerWords: [String],
          pace: Number,
          volume: Number,
          clarity: Number,
        },
      },
    ],
    screenMetrics: [
      {
        timestamp: Number,
        screen: {
          tabSwitches: Number,
          focusLoss: Number,
          recordingDetected: Boolean,
          externalDisplay: Boolean,
          devToolsOpen: Boolean,
        },
      },
    ],
    multimodalAnalysis: {
      voice: {
        confidence: Number,
        nervousness: Number,
        enthusiasm: Number,
        clarity: Number,
        pace: Number,
        sentiment: String,
        warnings: [String],
        source: String,
      },
      facial: {
        expressions: mongoose.Schema.Types.Mixed,
        dominantEmotion: String,
        engagementScore: Number,
        eyeContact: Number,
        blinkRate: Number,
        warnings: [String],
      },
      gestures: {
        gestures: [String],
        fidgeting: Number,
        confidenceSignals: Number,
        overallBodyLanguage: String,
      },
      eyeGaze: {
        gazeDirection: String,
        lookingAtScreen: Number,
        lookingAwayCount: Number,
        notesUsed: Boolean,
        suspicious: Boolean,
      },
      posture: {
        posture: String,
        engagementLevel: Number,
        confidenceScore: Number,
      },
      overallScore: Number,
      warnings: [String],
    },
  },
  { timestamps: true },
);

proctoringSessionSchema.index({ interviewId: 1, createdAt: -1 });
proctoringSessionSchema.index({ userId: 1, status: 1 });

export const ProctoringSessionModel = mongoose.model(
  "ProctoringSession",
  proctoringSessionSchema,
);
