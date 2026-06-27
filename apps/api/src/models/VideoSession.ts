import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IVideoSession {
  id: string;
  roomId: string;
  creatorId: string;
  participants: string[];
  status: 'creating' | 'active' | 'ended' | 'failed';
  startedAt?: Date;
  endedAt?: Date;
  recordingUrl?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const videoSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  roomId: { type: String, required: true, index: true },
  creatorId: { type: String, required: true },
  participants: [{ type: String }],
  status: {
    type: String,
    enum: ['creating', 'active', 'ended', 'failed'],
    required: true,
  },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  recordingUrl: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const VideoSessionModel = mongoose.model<IVideoSession>('VideoSession', videoSessionSchema);
