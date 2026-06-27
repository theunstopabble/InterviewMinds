import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IRetentionPolicy {
  id: string;
  name: string;
  description?: string;
  resourceType: string;
  retentionDays: number;
  action: 'delete' | 'archive' | 'anonymize';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const retentionPolicySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: null },
  resourceType: { type: String, required: true },
  retentionDays: { type: Number, required: true },
  action: {
    type: String,
    enum: ['delete', 'archive', 'anonymize'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const RetentionPolicyModel = mongoose.model<IRetentionPolicy>('RetentionPolicy', retentionPolicySchema);
