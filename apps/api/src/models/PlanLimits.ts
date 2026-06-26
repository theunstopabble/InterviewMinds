import mongoose, { Document } from 'mongoose';

export interface IPlanLimits extends Document {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  storage: number;
  rateLimit: number;
  features: string[];
}

const planLimitsSchema = new mongoose.Schema({
  plan: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'starter', 'professional', 'enterprise'],
  },
  storage: { type: Number, required: true },
  rateLimit: { type: Number, required: true },
  features: { type: [String], default: [] },
}, { timestamps: true });

export const PlanLimitsModel = mongoose.model<IPlanLimits>('PlanLimits', planLimitsSchema);
