import mongoose from "mongoose";
import { IInterview } from "@interview-minds/shared"; // ✅ Import Shared Interface

const InterviewSchema = new mongoose.Schema<IInterview>({
  userId: { type: String, required: true, index: true }, // Index for fast history lookup

  resumeId: {
    type: String, // Storing as String to match shared interface
    required: true,
    ref: "Resume",
  },

  // ✅ New Field: Track Interview State
  status: {
    type: String,
    enum: ["ongoing", "completed"],
    default: "ongoing",
  },

  conversation: [
    {
      role: {
        type: String,
        enum: ["user", "model", "system"], // Added 'system'
        required: true,
      },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],

  // AI Feedback (Optional initially)
  feedback: {
    rating: { type: Number },
    strengths: [String],
    improvements: [String],
    summary: String,
  },

  // Standard Timestamp
  createdAt: { type: Date, default: Date.now },
});

export const InterviewModel = mongoose.model<IInterview>(
  "Interview",
  InterviewSchema,
);
