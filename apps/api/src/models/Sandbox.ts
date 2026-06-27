import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ISandbox {
  id: string;
  code: string;
  language: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'terminated';
  input?: string;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsage?: number;
  timeout: number;
  createdAt: Date;
  updatedAt: Date;
}

const sandboxSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  code: { type: String, required: true },
  language: { type: String, required: true },
  status: {
    type: String,
    enum: ['created', 'running', 'completed', 'failed', 'terminated'],
    required: true,
  },
  input: { type: String, default: null },
  output: { type: String, default: null },
  error: { type: String, default: null },
  executionTime: { type: Number, default: null },
  memoryUsage: { type: Number, default: null },
  timeout: { type: Number, default: 5000 },
}, { timestamps: true });

export const SandboxModel = mongoose.model<ISandbox>('Sandbox', sandboxSchema);
