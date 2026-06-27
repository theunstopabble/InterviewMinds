import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IVote {
  id: string;
  sessionId: string;
  userId: string;
  candidateId: string;
  rating: number;
  comment?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const voteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  candidateId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: null },
  category: { type: String, default: null },
}, { timestamps: true });

voteSchema.index({ sessionId: 1, userId: 1, candidateId: 1 });

export const VoteModel = mongoose.model<IVote>('Vote', voteSchema);
