import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
  // 🔗 Link to User (Clerk ID)
  // ⚠️ FIX: Changed from ObjectId to String because Clerk IDs are strings
  userId: {
    type: String,
    required: true,
    index: true,
  },

  // 📄 Link to Resume
  resumeId: {
    type: String,
    required: true,
    ref: "Resume",
  },

  // 🚦 State Management
  status: {
    type: String,
    enum: ["ongoing", "completed"],
    default: "ongoing",
  },

  // 📹 Phase 6: Video Recording (Cloudinary URL)
  // ✅ NEW FIELD: Ye zaroori hai video save karne ke liye
  videoUrl: {
    type: String,
    required: false, // Optional initially, upload ke baad update hoga
  },

  // 💬 Chat History
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

  // 📊 Phase 4: Analytics Data (Radar Chart & Scorecard)
  score: { type: Number, default: 0 }, // Overall Score (0-100)

  feedback: { type: String, default: "" }, // 2-3 line summary

  // Radar Chart Metrics
  metrics: [
    {
      subject: String, // e.g., "Technical", "Communication"
      A: Number, // User Score (e.g., 85)
      fullMark: { type: Number, default: 100 },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

export const InterviewModel = mongoose.model("Interview", interviewSchema);