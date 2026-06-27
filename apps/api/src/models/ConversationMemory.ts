import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IConversationMemoryMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IConversationMemory {
  id: string;
  sessionId: string;
  interviewId: string;
  messages: IConversationMemoryMessage[];
  config?: any;
  createdAt: Date;
  updatedAt: Date;
}

const conversationMemorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  sessionId: { type: String, required: true, index: true },
  interviewId: { type: String, required: true, index: true },
  messages: [{
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true,
    },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const ConversationMemoryModel = mongoose.model<IConversationMemory>('ConversationMemory', conversationMemorySchema);
