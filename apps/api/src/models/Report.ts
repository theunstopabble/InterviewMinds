import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IReport extends Document {
  id: string;
  title: string;
  type: 'interview' | 'candidate' | 'pipeline' | 'analytics' | 'custom';
  candidateId?: string;
  interviewIds: string[];
  generatedBy: string;
  data: any;
  format: 'pdf' | 'csv' | 'json' | 'html';
  status: 'generating' | 'ready' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['interview', 'candidate', 'pipeline', 'analytics', 'custom'],
    required: true,
  },
  candidateId: { type: String, default: null },
  interviewIds: [{ type: String }],
  generatedBy: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: null },
  format: {
    type: String,
    enum: ['pdf', 'csv', 'json', 'html'],
    required: true,
  },
  status: {
    type: String,
    enum: ['generating', 'ready', 'failed'],
    default: 'generating',
  },
  fileUrl: { type: String, default: null },
  fileSize: { type: Number, default: null },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ candidateId: 1 });

export const ReportModel = mongoose.model<IReport>('Report', reportSchema);
