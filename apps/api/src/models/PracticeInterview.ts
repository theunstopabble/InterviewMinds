import mongoose from "mongoose";

const PracticeQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ["behavioral", "technical", "coding", "system-design"], required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  expectedDuration: { type: Number, required: true },
  sampleAnswer: { type: String },
  evaluationCriteria: [{ type: String }],
});

const PracticeAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  answer: { type: String, required: true },
  audioUrl: { type: String },
  videoUrl: { type: String },
  code: { type: String },
  responseTime: { type: Number, required: true },
  timestamp: { type: Date, required: true },
});

const PracticeFeedbackSchema = new mongoose.Schema({
  overallScore: { type: Number, required: true },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  detailedScores: [
    {
      questionId: { type: String, required: true },
      score: { type: Number, required: true },
      feedback: { type: String, required: true },
    },
  ],
  generatedAt: { type: Date, required: true },
});

const PracticeInterviewSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  role: { type: String, required: true },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"], required: true },
  questions: [PracticeQuestionSchema],
  answers: [PracticeAnswerSchema],
  status: { type: String, enum: ["not_started", "in_progress", "completed", "abandoned"], default: "not_started" },
  feedbackStatus: { type: String, enum: ["pending", "generated"], default: "pending" },
  feedback: { type: PracticeFeedbackSchema, default: null },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  totalDuration: { type: Number, default: 0 },
  isRecorded: { type: Boolean, default: false },
});

export const PracticeInterviewModel = mongoose.model("PracticeInterview", PracticeInterviewSchema);
