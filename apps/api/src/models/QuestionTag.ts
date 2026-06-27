import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IQuestionTag extends Document {
  id: string;
  name: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionTagSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  name: { type: String, required: true },
  category: { type: String, default: null },
}, { timestamps: true });

export const QuestionTagModel = mongoose.model<IQuestionTag>('QuestionTag', questionTagSchema);
