import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration: number;
  severity: 'critical' | 'warning' | 'info';
  channels: string[];
  isActive: boolean;
  cooldown: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertRuleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: null },
  metric: { type: String, required: true },
  condition: {
    type: String,
    enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'ne'],
    required: true,
  },
  threshold: { type: Number, required: true },
  duration: { type: Number, required: true },
  severity: { type: String, enum: ['critical', 'warning', 'info'], default: 'warning' },
  channels: [{ type: String }],
  isActive: { type: Boolean, default: true },
  cooldown: { type: Number, default: 300 },
  lastTriggeredAt: { type: Date, default: null },
}, { timestamps: true });

export const AlertRuleModel = mongoose.model<IAlertRule>('AlertRule', alertRuleSchema);
