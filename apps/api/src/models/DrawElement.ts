import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IDrawElement {
  id: string;
  sessionId: string;
  type: 'line' | 'rect' | 'circle' | 'text' | 'path' | 'image';
  points?: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  opacity: number;
  fill?: string;
  fontSize?: number;
  text?: string;
  zIndex: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const drawElementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  sessionId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['line', 'rect', 'circle', 'text', 'path', 'image'],
    required: true,
  },
  points: [{
    x: { type: Number },
    y: { type: Number },
  }],
  color: { type: String, default: '#000000' },
  strokeWidth: { type: Number, default: 2 },
  opacity: { type: Number, default: 1, min: 0, max: 1 },
  fill: { type: String, default: null },
  fontSize: { type: Number, default: null },
  text: { type: String, default: null },
  zIndex: { type: Number, default: 0 },
  createdBy: { type: String, default: null },
}, { timestamps: true });

drawElementSchema.index({ sessionId: 1, zIndex: 1 });

export const DrawElementModel = mongoose.model<IDrawElement>('DrawElement', drawElementSchema);
