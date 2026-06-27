import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description: string;
}

export interface IChallengeQuestion {
  id: string;
  title: string;
  description: string;
  type: 'coding' | 'project' | 'quiz' | 'design';
  points: number;
  timeLimit?: number;
  starterCode?: Map<string, string>;
  testCases?: ITestCase[];
  fileSubmission?: boolean;
  maxFileSize?: number;
  allowedExtensions?: string[];
  multipleChoiceAnswer?: string;
  options?: string[];
}

export interface IChallenge extends Document {
  id: string;
  title: string;
  description: string;
  instructions: string;
  companyId: string;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  duration: number;
  questions: IChallengeQuestion[];
  allowedLanguages?: string[];
  status: 'draft' | 'sent' | 'in-progress' | 'submitted' | 'graded' | 'expired';
  candidates: string[];
  sentAt?: Date;
  startsAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const challengeQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true, default: () => uuidv4() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true, enum: ['coding', 'project', 'quiz', 'design'] },
  points: { type: Number, required: true },
  timeLimit: Number,
  starterCode: { type: Map, of: String },
  testCases: [{
    id: { type: String, required: true, default: () => uuidv4() },
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, required: true },
    description: { type: String, required: true },
  }],
  fileSubmission: Boolean,
  maxFileSize: Number,
  allowedExtensions: [String],
  multipleChoiceAnswer: String,
  options: [String],
});

const challengeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructions: { type: String, required: true },
  companyId: { type: String, required: true },
  role: { type: String, required: true },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard', 'expert'] },
  duration: { type: Number, required: true },
  questions: [challengeQuestionSchema],
  allowedLanguages: [String],
  status: {
    type: String,
    required: true,
    enum: ['draft', 'sent', 'in-progress', 'submitted', 'graded', 'expired'],
    default: 'draft',
  },
  candidates: [{ type: String }],
  sentAt: Date,
  startsAt: Date,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

challengeSchema.index({ companyId: 1 });
challengeSchema.index({ status: 1 });

export const ChallengeModel = mongoose.model<IChallenge>('Challenge', challengeSchema);
