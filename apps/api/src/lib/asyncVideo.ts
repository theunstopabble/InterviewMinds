import { v4 as uuidv4 } from 'uuid';
import { AsyncInterviewModel } from '../models/AsyncInterview';

export type AsyncStatus = 'draft' | 'sent' | 'in-progress' | 'completed' | 'expired';

export interface AsyncQuestion {
  id: string;
  questionText: string;
  questionType: 'text' | 'video' | 'coding' | 'multiple-choice';
  timeLimit: number;
  maxRetakes: number;
  videoUrl?: string;
  codeTemplate?: string;
  options?: string[];
  correctAnswer?: string;
}

export interface AsyncAnswer {
  questionId: string;
  answerText?: string;
  videoUrl?: string;
  codeAnswer?: string;
  selectedOption?: string;
  recordedAt: Date;
  retakeCount: number;
}

export interface AsyncInterview {
  id: string;
  title: string;
  description: string;
  candidateId: string;
  candidateEmail: string;
  companyId: string;
  role: string;
  questions: AsyncQuestion[];
  answers: AsyncAnswer[];
  status: AsyncStatus;
  sentAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  timeSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

function toInterview(doc: Record<string, any>): AsyncInterview {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description ?? '',
    candidateId: doc.candidateId,
    candidateEmail: doc.candidateEmail ?? '',
    companyId: doc.companyId ?? '',
    role: doc.role,
    questions: (doc.questions ?? []).map((q: Record<string, any>) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      timeLimit: q.timeLimit,
      maxRetakes: q.maxRetakes,
      videoUrl: q.videoUrl,
      codeTemplate: q.codeTemplate,
      options: q.options,
      correctAnswer: q.correctAnswer,
    })),
    answers: (doc.answers ?? []).map((a: Record<string, any>) => ({
      questionId: a.questionId,
      answerText: a.answerText,
      videoUrl: a.videoUrl,
      codeAnswer: a.codeAnswer,
      selectedOption: a.selectedOption,
      recordedAt: a.recordedAt,
      retakeCount: a.retakeCount,
    })),
    status: doc.status,
    sentAt: doc.sentAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    expiresAt: doc.expiresAt,
    timeSpent: doc.timeSpent ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

class AsyncVideoService {
  async createAsyncInterview(
    title: string,
    description: string,
    candidateId: string,
    candidateEmail: string,
    companyId: string,
    role: string,
    questions: AsyncQuestion[]
  ): Promise<AsyncInterview> {
    const doc = await AsyncInterviewModel.create({
      id: uuidv4(),
      title,
      description,
      candidateId,
      candidateEmail,
      companyId,
      role,
      questions,
      answers: [],
      status: 'draft',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      timeSpent: 0,
    });
    return toInterview(doc.toObject());
  }

  async sendToCandidate(interviewId: string): Promise<AsyncInterview | null> {
    const doc = await AsyncInterviewModel.findOneAndUpdate(
      { id: interviewId, status: 'draft' },
      { $set: { status: 'sent', sentAt: new Date() } },
      { new: true, lean: true }
    );
    return doc ? toInterview(doc) : null;
  }

  async startInterview(interviewId: string, candidateId: string): Promise<AsyncInterview | null> {
    const doc = await AsyncInterviewModel.findOneAndUpdate(
      {
        id: interviewId,
        candidateId,
        status: { $nin: ['expired', 'completed'] },
      },
      { $set: { status: 'in-progress', startedAt: new Date() } },
      { new: true, lean: true }
    );
    return doc ? toInterview(doc) : null;
  }

  async saveAnswer(
    interviewId: string,
    questionId: string,
    answer: Omit<AsyncAnswer, 'questionId' | 'recordedAt'>
  ): Promise<AsyncInterview | null> {
    const interview = await AsyncInterviewModel.findOne({ id: interviewId });
    if (!interview || interview.status !== 'in-progress') return null;

    const question = interview.questions.find((q: any) => q.id === questionId);
    if (!question) return null;

    const existingAnswerIndex = interview.answers.findIndex((a: any) => a.questionId === questionId);
    const newAnswer = {
      questionId,
      ...answer,
      recordedAt: new Date(),
    };

    if (existingAnswerIndex !== -1) {
      interview.answers[existingAnswerIndex] = newAnswer as any;
    } else {
      interview.answers.push(newAnswer as any);
    }

    await interview.save();
    return toInterview(interview.toObject());
  }

  async completeInterview(interviewId: string, candidateId: string): Promise<AsyncInterview | null> {
    const interview = await AsyncInterviewModel.findOne({ id: interviewId, candidateId });
    if (!interview) return null;

    let timeSpent = 0;
    if (interview.startedAt) {
      timeSpent = (Date.now() - new Date(interview.startedAt).getTime()) / 1000;
    }

    interview.status = 'completed';
    interview.completedAt = new Date();
    interview.timeSpent = timeSpent;

    await interview.save();
    return toInterview(interview.toObject());
  }

  async getInterview(id: string): Promise<AsyncInterview | null> {
    const doc = await AsyncInterviewModel.findOne({ id }).lean();
    return doc ? toInterview(doc) : null;
  }

  async getCandidateInterviews(candidateId: string): Promise<AsyncInterview[]> {
    const docs = await AsyncInterviewModel.find({ candidateId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toInterview);
  }

  async getCompanyInterviews(companyId: string): Promise<AsyncInterview[]> {
    const docs = await AsyncInterviewModel.find({ companyId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toInterview);
  }

  async getPendingInterviews(candidateId: string): Promise<AsyncInterview[]> {
    const docs = await AsyncInterviewModel.find({
      candidateId,
      status: { $in: ['sent', 'in-progress'] },
    })
      .sort({ expiresAt: -1 })
      .lean();
    return docs.map(toInterview);
  }

  async getCompletedInterviews(candidateId: string): Promise<AsyncInterview[]> {
    const docs = await AsyncInterviewModel.find({
      candidateId,
      status: 'completed',
    }).lean();
    return docs.map(toInterview);
  }

  async checkExpiredInterviews(): Promise<number> {
    const result = await AsyncInterviewModel.updateMany(
      {
        expiresAt: { $lte: new Date() },
        status: { $in: ['sent', 'in-progress'] },
      },
      { $set: { status: 'expired' } }
    );
    return result.modifiedCount;
  }

  async getProgress(interviewId: string): Promise<{ answered: number; total: number; percentage: number }> {
    const doc = await AsyncInterviewModel.findOne({ id: interviewId }).lean();
    if (!doc) return { answered: 0, total: 0, percentage: 0 };

    const answered = doc.answers.length;
    const total = doc.questions.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, total, percentage };
  }

  async canRetake(interviewId: string, questionId: string, candidateId: string): Promise<boolean> {
    const doc = await AsyncInterviewModel.findOne({ id: interviewId, candidateId }).lean();
    if (!doc) return false;

    const question = doc.questions.find((q: any) => q.id === questionId);
    if (!question) return false;

    const existingAnswer = doc.answers.find((a: any) => a.questionId === questionId);
    if (!existingAnswer) return true;

    return existingAnswer.retakeCount < question.maxRetakes;
  }

  async getTimeRemaining(interviewId: string): Promise<number> {
    const doc = await AsyncInterviewModel.findOne({ id: interviewId }).lean();
    if (!doc) return 0;

    if (doc.status === 'completed' || doc.status === 'expired') return 0;

    const remaining = new Date(doc.expiresAt).getTime() - Date.now();
    return Math.max(0, remaining);
  }
}

export const asyncVideoService = new AsyncVideoService();
export default asyncVideoService;
