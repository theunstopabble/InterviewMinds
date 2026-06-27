import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ICriterion {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight: number;
}

export interface IScorecardTemplate extends Document {
  id: string;
  name: string;
  description?: string;
  criteria: ICriterion[];
  isActive: boolean;
  createdBy: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scorecardTemplateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: null },
  criteria: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    maxScore: { type: Number, required: true },
    weight: { type: Number, required: true },
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  companyId: { type: String, default: null },
}, { timestamps: true });

export const ScorecardTemplateModel = mongoose.model<IScorecardTemplate>('ScorecardTemplate', scorecardTemplateSchema);
