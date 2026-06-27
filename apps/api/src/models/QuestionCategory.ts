import mongoose, { Document } from 'mongoose';

export interface IQuestionCategory extends Document {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionCategorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  questionCount: { type: Number, default: 0 },
  icon: { type: String, default: null },
}, { timestamps: true });

export const QuestionCategoryModel = mongoose.model<IQuestionCategory>('QuestionCategory', questionCategorySchema);
