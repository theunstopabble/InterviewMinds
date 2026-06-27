import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITraceSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  service?: string;
  duration?: number;
  status: 'ok' | 'error';
  metadata?: any;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

const traceSpanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  traceId: { type: String, required: true, index: true },
  parentSpanId: { type: String, default: null },
  name: { type: String, required: true },
  service: { type: String, default: null },
  duration: { type: Number, default: null },
  status: {
    type: String,
    enum: ['ok', 'error'],
    required: true,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

traceSpanSchema.index({ traceId: 1, startedAt: 1 });

export const TraceSpanModel = mongoose.model<ITraceSpan>('TraceSpan', traceSpanSchema);
