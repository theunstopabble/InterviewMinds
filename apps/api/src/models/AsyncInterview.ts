import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAsyncInterview {
  id: string;
  title: string;
  candidateId: string;
  candidateEmail?: string;
  role: string;
  questions: {
    id: string;
    questionText: string;
    questionType: 'text' | 'video' | 'coding' | 'multiple-choice';
    timeLimit: number;
    maxRetakes: number;
    videoUrl?: string;
    codeTemplate?: string;
    options?: string[];
    correctAnswer?: string;
  }[];
  status: 'draft' | 'sent' | 'in-progress' | 'completed' | 'expired';
  answers: {
    questionId: string;
    answerText?: string;
    videoUrl?: string;
    codeAnswer?: string;
    selectedOption?: string;
    recordedAt: Date;
    retakeCount: number;
  }[];
  description?: string;
  companyId?: string;
  sentAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  timeSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSubSchema = new mongoose.Schema({
  id: { type: String, required: true, default: () => uuidv4() },
  questionText: { type: String, required: true },
  questionType: { type: String, enum: ['text', 'video', 'coding', 'multiple-choice'], required: true },
  timeLimit: { type: Number, required: true },
  maxRetakes: { type: Number, default: 0 },
  videoUrl: { type: String, default: null },
  codeTemplate: { type: String, default: null },
  options: { type: [String], default: null },
  correctAnswer: { type: String, default: null },
}, { _id: false });

const answerSubSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  answerText: { type: String, default: null },
  videoUrl: { type: String, default: null },
  codeAnswer: { type: String, default: null },
  selectedOption: { type: String, default: null },
  recordedAt: { type: Date, default: Date.now },
  retakeCount: { type: Number, default: 0 },
}, { _id: false });

const asyncInterviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  candidateId: { type: String, required: true, index: true },
  candidateEmail: { type: String, default: null },
  role: { type: String, required: true },
  description: { type: String, default: '' },
  companyId: { type: String, default: null, index: true },
  questions: { type: [questionSubSchema], default: [] },
  status: {
    type: String,
    enum: ['draft', 'sent', 'in-progress', 'completed', 'expired'],
    default: 'draft',
    index: true,
  },
  answers: { type: [answerSubSchema], default: [] },
  sentAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
  timeSpent: { type: Number, default: 0 },
}, { timestamps: true });

asyncInterviewSchema.index({ candidateId: 1, status: 1 });
asyncInterviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AsyncInterviewModel = mongoose.model('AsyncInterview', asyncInterviewSchema);
