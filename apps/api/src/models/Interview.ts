import mongoose from "mongoose";

const InterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Future mein Auth ID aayega
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
  },
  date: { type: Date, default: Date.now },
  conversation: [
    {
      role: { type: String, enum: ["user", "model"], required: true },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  // AI se milne wala Feedback
  feedback: {
    rating: { type: Number }, // Out of 10
    strengths: [String],
    improvements: [String],
    summary: String,
  },
});

export const InterviewModel = mongoose.model("Interview", InterviewSchema);
