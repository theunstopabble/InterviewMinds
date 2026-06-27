import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ISharedNote {
  id: string;
  sessionId: string;
  authorId: string;
  content: string;
  type: 'text' | 'code' | 'whiteboard';
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sharedNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  sessionId: { type: String, required: true, index: true },
  authorId: { type: String, required: true },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'code', 'whiteboard'],
    required: true,
  },
  tags: [{ type: String }],
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

export const SharedNoteModel = mongoose.model<ISharedNote>('SharedNote', sharedNoteSchema);
