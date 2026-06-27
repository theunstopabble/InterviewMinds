import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IStarMethod {
  situation: number;
  task: number;
  action: number;
  result: number;
}

export interface IRedFlag {
  type: 'vague' | 'inconsistent' | 'memorized' | 'copied' | 'over_confident' | 'under_confident';
  description: string;
  timestamp: string;
}

export interface IAnswerEvaluation extends Document {
  id: string;
  question: string;
  transcript: string;
  contentScore: number;
  technicalAccuracy: number;
  clarity: number;
  depthScore: number;
  starMethod: IStarMethod;
  redFlags: IRedFlag[];
  suggestedFollowUp?: string;
  overallScore: number;
  feedback: string;
  userId?: string;
  createdAt: Date;
}

const answerEvaluationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  question: { type: String, required: true },
  transcript: { type: String, required: true },
  contentScore: { type: Number, default: 0 },
  technicalAccuracy: { type: Number, default: 0 },
  clarity: { type: Number, default: 0 },
  depthScore: { type: Number, default: 0 },
  starMethod: {
    situation: { type: Number, default: 0 },
    task: { type: Number, default: 0 },
    action: { type: Number, default: 0 },
    result: { type: Number, default: 0 },
  },
  redFlags: [{
    type: { type: String, enum: ['vague', 'inconsistent', 'memorized', 'copied', 'over_confident', 'under_confident'] },
    description: { type: String },
    timestamp: { type: String },
  }],
  suggestedFollowUp: { type: String, default: null },
  overallScore: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  userId: { type: String, default: null },
}, { timestamps: true });

export const AnswerEvaluationModel = mongoose.model<IAnswerEvaluation>('AnswerEvaluation', answerEvaluationSchema);
