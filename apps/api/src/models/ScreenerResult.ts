import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ISkillMatch {
  name: string;
  matched: boolean;
  yearsRequired: number;
  yearsActual: number;
  source: 'resume' | 'inferred';
}

export interface IExperience {
  years: number;
  relevance: number;
}

export interface IEducation {
  level: string;
  field: string;
  matched: boolean;
}

export interface IScreenerResult extends Document {
  id: string;
  candidateId: string;
  resumeId: string;
  jobTitle: string;
  company: string;
  overallScore: number;
  skillMatches: ISkillMatch[];
  experience: IExperience;
  education: IEducation;
  cultureFit: number;
  recommendation: 'strong_reject' | 'reject' | 'maybe' | 'hire' | 'strong_hire';
  redFlags: string[];
  notes?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const screenerResultSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  candidateId: { type: String, required: true },
  resumeId: { type: String, required: true },
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  overallScore: { type: Number, required: true },
  skillMatches: [{
    name: { type: String, required: true },
    matched: { type: Boolean, required: true },
    yearsRequired: { type: Number, required: true },
    yearsActual: { type: Number, required: true },
    source: { type: String, enum: ['resume', 'inferred'], required: true },
  }],
  experience: {
    years: { type: Number, required: true },
    relevance: { type: Number, required: true },
  },
  education: {
    level: { type: String, required: true },
    field: { type: String, required: true },
    matched: { type: Boolean, required: true },
  },
  cultureFit: { type: Number, required: true },
  recommendation: {
    type: String,
    enum: ['strong_reject', 'reject', 'maybe', 'hire', 'strong_hire'],
    required: true,
  },
  redFlags: [{ type: String }],
  notes: { type: String, default: null },
  processedAt: { type: Date, default: null },
}, { timestamps: true });

screenerResultSchema.index({ candidateId: 1 });
screenerResultSchema.index({ jobTitle: 1, company: 1 });
screenerResultSchema.index({ overallScore: -1 });

export const ScreenerResultModel = mongoose.model<IScreenerResult>('ScreenerResult', screenerResultSchema);
