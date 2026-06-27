import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IChatbotMessage {
  id: string;
  role: 'assistant' | 'user' | 'candidate';
  content: string;
  timestamp: Date;
  metadata?: Map<string, any>;
}

export interface IChatbotConversation extends Document {
  id: string;
  candidateId: string;
  sessionId: string;
  messages: IChatbotMessage[];
  status: 'active' | 'completed' | 'abandoned';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatbotConversationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  candidateId: { type: String, required: true },
  sessionId: { type: String, required: true },
  messages: [{
    id: { type: String, required: true, default: () => uuidv4() },
    role: { type: String, enum: ['assistant', 'user', 'candidate'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: null },
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

chatbotConversationSchema.index({ candidateId: 1, status: 1 });
chatbotConversationSchema.index({ sessionId: 1 }, { unique: true });

export const ChatbotConversationModel = mongoose.model<IChatbotConversation>('ChatbotConversation', chatbotConversationSchema);
