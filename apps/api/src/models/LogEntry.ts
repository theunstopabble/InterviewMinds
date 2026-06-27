import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ILogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service?: string;
  trace?: string;
  span?: string;
  metadata?: any;
  timestamp: Date;
  createdAt: Date;
}

const logEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  level: {
    type: String,
    enum: ['debug', 'info', 'warn', 'error', 'fatal'],
    required: true,
  },
  message: { type: String, required: true },
  service: { type: String, default: null },
  trace: { type: String, default: null },
  span: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

logEntrySchema.index({ level: 1, timestamp: -1 });
logEntrySchema.index({ service: 1, timestamp: -1 });

export const LogEntryModel = mongoose.model<ILogEntry>('LogEntry', logEntrySchema);
