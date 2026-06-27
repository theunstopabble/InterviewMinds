import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAutomationAction {
  type: 'webhook' | 'email' | 'slack' | 'notification' | 'custom';
  config: any;
}

export interface IAutomation extends Document {
  id: string;
  name: string;
  description?: string;
  trigger: 'interview_completed' | 'candidate_added' | 'feedback_generated' | 'schedule_reminder' | 'custom';
  triggerConfig: any;
  actions: IAutomationAction[];
  isActive: boolean;
  createdBy: string;
  lastRunAt?: Date;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const automationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: null },
  trigger: {
    type: String,
    enum: ['interview_completed', 'candidate_added', 'feedback_generated', 'schedule_reminder', 'custom'],
    required: true,
  },
  triggerConfig: { type: mongoose.Schema.Types.Mixed, default: null },
  actions: [{
    type: { type: String, enum: ['webhook', 'email', 'slack', 'notification', 'custom'], required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: null },
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
  lastRunAt: { type: Date, default: null },
  runCount: { type: Number, default: 0 },
}, { timestamps: true });

export const AutomationModel = mongoose.model<IAutomation>('Automation', automationSchema);
