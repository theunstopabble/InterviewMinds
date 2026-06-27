import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description?: string;
}

export interface IQuestion extends Document {
  id: string;
  title: string;
  description: string;
  type: 'coding' | 'multiple-choice' | 'sql' | 'system-design' | 'behavioral' | 'technical';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: string;
  tags: string[];
  skills: string[];
  timeLimit: number;
  points: number;
  starterCode: Map<string, string>;
  testCases: ITestCase[];
  solution: string;
  explanation: string;
  createdBy: string;
  companyId?: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['coding', 'multiple-choice', 'sql', 'system-design', 'behavioral', 'technical'],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    required: true,
  },
  category: { type: String, required: true },
  tags: [{ type: String }],
  skills: [{ type: String }],
  timeLimit: { type: Number, default: null },
  points: { type: Number, default: null },
  starterCode: { type: Map, of: String, default: new Map() },
  testCases: [{
    id: { type: String, required: true },
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
    description: { type: String, default: null },
  }],
  solution: { type: String, default: null },
  explanation: { type: String, default: null },
  createdBy: { type: String, required: true },
  companyId: { type: String, default: null },
  isPublic: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });

export const QuestionModel = mongoose.model<IQuestion>('Question', questionSchema);
