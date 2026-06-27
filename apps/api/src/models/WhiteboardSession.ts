import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IWhiteboardSession {
  id: string;
  roomId: string;
  creatorId: string;
  name?: string;
  width: number;
  height: number;
  backgroundColor: string;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const whiteboardSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  roomId: { type: String, required: true, index: true },
  creatorId: { type: String, required: true },
  name: { type: String, default: null },
  width: { type: Number, default: 1920 },
  height: { type: Number, default: 1080 },
  backgroundColor: { type: String, default: '#ffffff' },
  isLocked: { type: Boolean, default: false },
}, { timestamps: true });

export const WhiteboardSessionModel = mongoose.model<IWhiteboardSession>('WhiteboardSession', whiteboardSessionSchema);
