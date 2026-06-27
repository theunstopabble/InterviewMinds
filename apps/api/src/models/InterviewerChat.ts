import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IInterviewerChat {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'code' | 'suggestion' | 'system';
  metadata?: any;
  createdAt: Date;
}

const interviewerChatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  sessionId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  messageType: {
    type: String,
    enum: ['text', 'code', 'suggestion', 'system'],
    required: true,
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

interviewerChatSchema.index({ sessionId: 1, createdAt: 1 });

export const InterviewerChatModel = mongoose.model<IInterviewerChat>('InterviewerChat', interviewerChatSchema);
