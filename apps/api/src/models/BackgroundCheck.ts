import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IBackgroundCheck {
  id: string;
  candidateId: string;
  type: 'identity' | 'criminal' | 'employment' | 'education' | 'drug_test' | 'reference' | 'credit';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'disputed';
  provider?: string;
  result?: any;
  score?: number;
  report?: string;
  requestedBy?: string;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const backgroundCheckSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  candidateId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['identity', 'criminal', 'employment', 'education', 'drug_test', 'reference', 'credit'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'disputed'],
    required: true,
  },
  provider: { type: String, default: null },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  score: { type: Number, default: null },
  report: { type: String, default: null },
  requestedBy: { type: String, default: null },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

export const BackgroundCheckModel = mongoose.model<IBackgroundCheck>('BackgroundCheck', backgroundCheckSchema);
