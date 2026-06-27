import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IScoreEntry {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface IScorecard extends Document {
  id: string;
  interviewId: string;
  candidateId: string;
  interviewerId: string;
  templateId: string;
  scores: IScoreEntry[];
  totalScore: number;
  maxTotalScore: number;
  percentageScore: number;
  notes?: string;
  status: 'draft' | 'submitted' | 'approved';
  submittedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scorecardSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  interviewId: { type: String, required: true },
  candidateId: { type: String, required: true },
  interviewerId: { type: String, required: true },
  templateId: { type: String, required: true },
  scores: [{
    criterionId: { type: String, required: true },
    criterionName: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    comment: { type: String, default: null },
  }],
  totalScore: { type: Number, default: 0 },
  maxTotalScore: { type: Number, default: 0 },
  percentageScore: { type: Number, default: 0 },
  notes: { type: String, default: null },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved'],
    default: 'draft',
  },
  submittedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
}, { timestamps: true });

scorecardSchema.index({ interviewId: 1 });
scorecardSchema.index({ candidateId: 1 });

export const ScorecardModel = mongoose.model<IScorecard>('Scorecard', scorecardSchema);
