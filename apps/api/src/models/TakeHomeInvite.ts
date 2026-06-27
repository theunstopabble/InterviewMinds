import mongoose, { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IChallengeAnswer {
  questionId: string;
  code?: string;
  fileUrls?: string[];
  textAnswer?: string;
  multipleChoiceAnswer?: string;
}

export interface ISubmission {
  id: string;
  challengeId: string;
  candidateId: string;
  answers: IChallengeAnswer[];
  submittedAt: Date;
  timeSpent: number;
  status: 'submitted' | 'graded';
  score?: number;
  feedback?: string;
}

export interface IChallengeInvite extends Document {
  id: string;
  challengeId: string;
  candidateId: string;
  candidateEmail: string;
  status: 'pending' | 'started' | 'submitted' | 'expired';
  sentAt: Date;
  startedAt?: Date;
  submittedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  answers?: IChallengeAnswer[];
  timeSpent?: number;
  score?: number;
  feedback?: string;
}

const challengeAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  code: String,
  fileUrls: [String],
  textAnswer: String,
  multipleChoiceAnswer: String,
});

const submissionSchema = new mongoose.Schema({
  id: { type: String, required: true, default: () => uuidv4() },
  challengeId: { type: String, required: true },
  candidateId: { type: String, required: true },
  answers: [challengeAnswerSchema],
  submittedAt: { type: Date, required: true },
  timeSpent: { type: Number, required: true },
  status: { type: String, required: true, enum: ['submitted', 'graded'] },
  score: Number,
  feedback: String,
});

const challengeInviteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: () => uuidv4() },
  challengeId: { type: String, required: true },
  candidateId: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'started', 'submitted', 'expired'],
    default: 'pending',
  },
  sentAt: { type: Date, required: true },
  startedAt: Date,
  submittedAt: Date,
  expiresAt: { type: Date, required: true },
  answers: [challengeAnswerSchema],
  timeSpent: Number,
  score: Number,
  feedback: String,
}, { timestamps: true });

challengeInviteSchema.index({ challengeId: 1 });
challengeInviteSchema.index({ candidateId: 1 });
challengeInviteSchema.index({ status: 1 });

export const ChallengeInviteModel = mongoose.model<IChallengeInvite>('ChallengeInvite', challengeInviteSchema);
