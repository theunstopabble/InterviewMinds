import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITestCase {
  input: string;
  expectedOutput: string;
}

export interface ISQLChallenge extends Document {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  schemaSQL: string;
  solution: string;
  testCases: ITestCase[];
  hints: string[];
  timeLimit: number;
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISQLSubmission extends Document {
  id: string;
  challengeId: string;
  candidateId: string;
  query: string;
  passed: boolean;
  score: number;
  executionTime: number;
  error?: string;
  submittedAt: Date;
}

const testCaseSchema = new mongoose.Schema<ITestCase>({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
}, { _id: false });

const sqlChallengeSchema = new mongoose.Schema<ISQLChallenge>({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
  },
  category: { type: String, required: true },
  schemaSQL: { type: String, required: true },
  solution: { type: String, required: true },
  testCases: { type: [testCaseSchema], default: [] },
  hints: [{ type: String }],
  timeLimit: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  },
  createdBy: { type: String, required: true },
}, { timestamps: true });

const sqlSubmissionSchema = new mongoose.Schema<ISQLSubmission>({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  challengeId: { type: String, required: true },
  candidateId: { type: String, required: true },
  query: { type: String, required: true },
  passed: { type: Boolean, required: true },
  score: { type: Number, required: true },
  executionTime: { type: Number, required: true },
  error: { type: String, default: null },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

sqlSubmissionSchema.index({ challengeId: 1 });
sqlSubmissionSchema.index({ candidateId: 1 });

export const SQLChallengeModel = mongoose.model<ISQLChallenge>('SQLChallenge', sqlChallengeSchema);
export const SQLSubmissionModel = mongoose.model<ISQLSubmission>('SQLSubmission', sqlSubmissionSchema);
