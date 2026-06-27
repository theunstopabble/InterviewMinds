import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IBreakTimer {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: Date;
  pausedAt?: Date;
}

export interface ISampleQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
}

export interface IPreparationSession extends Document {
  id: string;
  candidateId: string;
  interviewType: 'live' | 'async' | 'take-home';
  role: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  sampleQuestions: ISampleQuestion[];
  breakTimer: IBreakTimer;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const breakTimerSchema = new mongoose.Schema({
  duration: { type: Number, required: true },
  remaining: { type: Number, required: true },
  isRunning: { type: Boolean, required: true, default: false },
  startedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
}, { _id: false });

const sampleQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, default: () => uuidv4() },
  question: { type: String, required: true },
  category: { type: String, required: true },
  difficulty: { type: String, required: true },
}, { _id: false });

const preparationSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  candidateId: { type: String, required: true, index: true },
  interviewType: {
    type: String,
    required: true,
    enum: ['live', 'async', 'take-home'],
  },
  role: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  sampleQuestions: [sampleQuestionSchema],
  breakTimer: { type: breakTimerSchema, required: true },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true, strict: false });

preparationSessionSchema.index({ candidateId: 1, status: 1 });
preparationSessionSchema.index({ candidateId: 1, interviewType: 1 });

export const PreparationSessionModel = mongoose.model<IPreparationSession>('PreparationSession', preparationSessionSchema);
