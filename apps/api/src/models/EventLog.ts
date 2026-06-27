import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IEventLog {
  id: string;
  event: string;
  channel: string;
  payload?: any;
  source?: string;
  status: 'emitted' | 'processing' | 'completed' | 'failed';
  handledBy: string[];
  error?: string;
  createdAt: Date;
}

const eventLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  event: { type: String, required: true, index: true },
  channel: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  source: { type: String, default: null },
  status: {
    type: String,
    enum: ['emitted', 'processing', 'completed', 'failed'],
    required: true,
  },
  handledBy: [{ type: String }],
  error: { type: String, default: null },
}, { timestamps: true });

eventLogSchema.index({ event: 1, createdAt: -1 });
eventLogSchema.index({ status: 1 });

export const EventLogModel = mongoose.model<IEventLog>('EventLog', eventLogSchema);
