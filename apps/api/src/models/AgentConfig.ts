import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IAgentConfig {
  id: string;
  name: string;
  description?: string;
  type: 'screening' | 'scheduling' | 'feedback' | 'evaluation' | 'interviewer' | 'analysis' | 'custom';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const agentConfigSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  description: { type: String, default: null },
  type: {
    type: String,
    enum: ['screening', 'scheduling', 'feedback', 'evaluation', 'interviewer', 'analysis', 'custom'],
    required: true,
  },
  model: { type: String, default: 'llama-3.3-70b-versatile' },
  temperature: { type: Number, default: 0.2 },
  maxTokens: { type: Number, default: 2048 },
  systemPrompt: { type: String, default: null },
  tools: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
}, { timestamps: true });

export const AgentConfigModel = mongoose.model<IAgentConfig>('AgentConfig', agentConfigSchema);
