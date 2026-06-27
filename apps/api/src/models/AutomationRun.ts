import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAutomationRunResult {
  action: string;
  status: string;
  output?: string;
  error?: string;
  duration?: number;
}

export interface IAutomationRun extends Document {
  id: string;
  automationId: string;
  triggerEvent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  results: IAutomationRunResult[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const automationRunSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  automationId: { type: String, required: true },
  triggerEvent: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  results: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    output: { type: String, default: null },
    error: { type: String, default: null },
    duration: { type: Number, default: null },
  }],
  errorMessage: { type: String, default: null },
}, { timestamps: true });

automationRunSchema.index({ automationId: 1, createdAt: -1 });

export const AutomationRunModel = mongoose.model<IAutomationRun>('AutomationRun', automationRunSchema);
