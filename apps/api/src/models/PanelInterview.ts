import mongoose, { Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IPanelist {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  joinedAt?: Date;
  leftAt?: Date;
}

export interface IPanelMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isPrivate: boolean;
}

export interface IPanelScore {
  interviewerId: string;
  score: number;
  feedback: string;
  submittedAt: Date;
}

export interface IPanelInterview extends Document {
  id: string;
  title: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  scheduledTime: Date;
  duration: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  panelists: IPanelist[];
  messages: IPanelMessage[];
  scores: IPanelScore[];
  finalScore?: number;
  recommendation?: "strong_hire" | "hire" | "neutral" | "no_hire" | "strong_no_hire";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const PanelistSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    companyId: { type: String, required: true },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
  },
  { _id: false },
);

const PanelMessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
    isPrivate: { type: Boolean, required: true },
  },
  { _id: false },
);

const PanelScoreSchema = new mongoose.Schema(
  {
    interviewerId: { type: String, required: true },
    score: { type: Number, required: true },
    feedback: { type: String, required: true },
    submittedAt: { type: Date, required: true },
  },
  { _id: false },
);

const PanelInterviewSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, default: () => uuidv4() },
    title: { type: String, required: true },
    candidateId: { type: String, required: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    role: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    panelists: [PanelistSchema],
    messages: [PanelMessageSchema],
    scores: [PanelScoreSchema],
    finalScore: { type: Number, default: null },
    recommendation: {
      type: String,
      enum: ["strong_hire", "hire", "neutral", "no_hire", "strong_no_hire"],
      default: null,
    },
    createdBy: { type: String, required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PanelInterviewModel = mongoose.model<IPanelInterview>("PanelInterview", PanelInterviewSchema);
