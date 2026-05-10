import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },

  resumeId: {
    type: String,
    required: true,
    ref: "Resume",
    index: true,
  },

  status: {
    type: String,
    enum: ["ongoing", "completed"],
    default: "ongoing",
    index: true,
  },

  completedAt: {
    type: Date,
    default: null,
  },

  videoUrl: {
    type: String,
    required: false,
  },

  messages: [
    {
      role: {
        type: String,
        enum: ["user", "model", "ai", "system"],
        required: true,
      },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],

  score: { type: Number, default: 0 },

  feedback: { type: String, default: "" },

  metrics: [
    {
      subject: String,
      A: Number,
      fullMark: { type: Number, default: 100 },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ completedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

interviewSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "completed") {
    this.completedAt = new Date();
  }
  next();
});

export const InterviewModel = mongoose.model("Interview", interviewSchema);