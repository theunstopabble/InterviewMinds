import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IReportSection {
  id: string;
  title: string;
  type: string;
  config: any;
}

export interface IReportTemplate extends Document {
  id: string;
  name: string;
  description?: string;
  type: 'interview' | 'candidate' | 'pipeline' | 'analytics' | 'custom';
  sections: IReportSection[];
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportTemplateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: null },
  type: {
    type: String,
    enum: ['interview', 'candidate', 'pipeline', 'analytics', 'custom'],
    required: true,
  },
  sections: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: null },
  }],
  isDefault: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
}, { timestamps: true });

export const ReportTemplateModel = mongoose.model<IReportTemplate>('ReportTemplate', reportTemplateSchema);
