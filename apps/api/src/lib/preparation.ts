import { v4 as uuidv4 } from 'uuid';
import { PreparationSessionModel } from '../models/PreparationSession';

export interface SystemCheckResult {
  camera: boolean;
  cameraName?: string;
  microphone: boolean;
  microphoneName?: string;
  speaker: boolean;
  internetSpeed: number;
  browser: string;
  os: string;
  screenResolution: string;
  checkPassed: boolean;
  warnings: string[];
}

export interface PreparationSession {
  id: string;
  userId: string;
  role: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  systemCheck: SystemCheckResult | null;
  sampleQuestions: PreparationQuestion[];
  currentQuestionIndex: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface PreparationQuestion {
  id: string;
  question: string;
  type: 'behavioral' | 'technical' | 'coding';
  difficulty: 'easy' | 'medium' | 'hard';
  sampleAnswer?: string;
  tips?: string[];
}

export interface BreakTimer {
  interviewId: string;
  totalDuration: number;
  breakDuration: number;
  breaksTaken: number;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

const DEFAULT_SAMPLE_QUESTIONS: PreparationQuestion[] = [
  {
    id: 'sample-1',
    question: 'Tell me about yourself and why you are interested in this role.',
    type: 'behavioral',
    difficulty: 'easy',
    sampleAnswer: 'Start with current role, highlight relevant experience, end with why this role interests you. Keep it under 2 minutes.',
    tips: ['Keep it concise', 'Focus on relevant experience', 'Show enthusiasm'],
  },
  {
    id: 'sample-2',
    question: 'Describe a challenging project you worked on and how you overcame the obstacle.',
    type: 'behavioral',
    difficulty: 'medium',
    sampleAnswer: 'Use STAR method: Situation, Task, Action, Result. Focus on your specific contribution.',
    tips: ['Use STAR method', 'Quantify results', 'Show problem-solving'],
  },
  {
    id: 'sample-3',
    question: 'What are your strengths and weaknesses?',
    type: 'behavioral',
    difficulty: 'easy',
    sampleAnswer: 'Pick real strengths relevant to the job. For weaknesses, show how you are working on them.',
    tips: ['Be honest', 'Show self-awareness', 'Focus on growth'],
  },
];

class PreparationService {
  async checkSystem(): Promise<SystemCheckResult> {
    return {
      camera: false,
      microphone: false,
      speaker: false,
      internetSpeed: 0,
      browser: '',
      os: '',
      screenResolution: '',
      checkPassed: false,
      warnings: ['System check requires a browser environment'],
    };
  }

  async createSession(userId: string, role: string): Promise<PreparationSession> {
    const id = uuidv4();
    const questions = this.getQuestionsForRole(role);

    const questionsForDb = questions.map(q => ({
      id: q.id,
      question: q.question,
      category: q.type,
      difficulty: q.difficulty,
      type: q.type,
      sampleAnswer: q.sampleAnswer,
      tips: q.tips,
    }));

    const doc = new PreparationSessionModel({
      id,
      userId,
      candidateId: userId,
      interviewType: 'live',
      role,
      status: 'not_started',
      sampleQuestions: questionsForDb,
      breakTimer: { duration: 0, remaining: 0, isRunning: false },
      systemCheck: null,
      currentQuestionIndex: 0,
      startedAt: new Date(),
    }, { strict: false });

    await doc.save();

    return {
      id,
      userId,
      role,
      status: 'not_started',
      systemCheck: null,
      sampleQuestions: questions,
      currentQuestionIndex: 0,
      startedAt: doc.startedAt || new Date(),
    };
  }

  async getSession(sessionId: string): Promise<PreparationSession | null> {
    const doc = await PreparationSessionModel.findOne({ id: sessionId }).lean();
    if (!doc) return null;
    return this.docToSession(doc);
  }

  async updateSession(sessionId: string, data: Partial<PreparationSession>): Promise<PreparationSession | null> {
    const updateData: Record<string, unknown> = {};
    if (data.userId !== undefined) updateData.userId = data.userId;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.systemCheck !== undefined) updateData.systemCheck = data.systemCheck;
    if (data.currentQuestionIndex !== undefined) updateData.currentQuestionIndex = data.currentQuestionIndex;
    if (data.startedAt !== undefined) updateData.startedAt = data.startedAt;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    if (data.sampleQuestions !== undefined) {
      updateData.sampleQuestions = data.sampleQuestions.map(q => ({
        id: q.id,
        question: q.question,
        category: q.type,
        difficulty: q.difficulty,
        type: q.type,
        sampleAnswer: q.sampleAnswer,
        tips: q.tips,
      }));
    }

    if (Object.keys(updateData).length === 0) {
      const doc = await PreparationSessionModel.findOne({ id: sessionId }).lean();
      return doc ? this.docToSession(doc) : null;
    }

    const doc = await PreparationSessionModel.findOneAndUpdate(
      { id: sessionId },
      { $set: updateData },
      { strict: false, new: true }
    ).lean();

    if (!doc) return null;
    return this.docToSession(doc);
  }

  async runSystemCheck(sessionId: string): Promise<SystemCheckResult> {
    const result = await this.checkSystem();
    await PreparationSessionModel.findOneAndUpdate(
      { id: sessionId },
      { $set: { systemCheck: result, status: result.checkPassed ? 'in_progress' : 'failed' } },
      { strict: false }
    );
    return result;
  }

  async nextQuestion(sessionId: string): Promise<PreparationQuestion | null> {
    const doc = await PreparationSessionModel.findOne({ id: sessionId }).lean();
    if (!doc) return null;

    const currentIndex = (doc as Record<string, unknown>).currentQuestionIndex as number || 0;
    const questions = this.getQuestionsFromDoc(doc);

    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      await PreparationSessionModel.findOneAndUpdate(
        { id: sessionId },
        { $set: { currentQuestionIndex: newIndex } },
        { strict: false }
      );
      return questions[newIndex];
    }
    return null;
  }

  async completeSession(sessionId: string): Promise<boolean> {
    const result = await PreparationSessionModel.findOneAndUpdate(
      { id: sessionId },
      { $set: { status: 'completed', completedAt: new Date() } },
      { strict: false }
    );
    return !!result;
  }

  async getCandidateSessions(candidateId: string): Promise<PreparationSession[]> {
    const docs = await PreparationSessionModel.find({ candidateId })
      .sort({ startedAt: -1 })
      .lean();
    return docs.map(d => this.docToSession(d));
  }

  async startBreak(candidateId: string, duration: number): Promise<BreakTimer> {
    const breakTimer: BreakTimer = {
      interviewId: candidateId,
      totalDuration: duration,
      breakDuration: duration,
      breaksTaken: 0,
      startTime: new Date(),
      isActive: true,
    };

    await PreparationSessionModel.findOneAndUpdate(
      { candidateId, status: { $in: ['in_progress', 'not_started'] } },
      {
        $set: {
          breakTimer: {
            duration,
            remaining: duration,
            isRunning: true,
            startedAt: new Date(),
            pausedAt: null,
          },
        },
      },
      { strict: false }
    );

    return breakTimer;
  }

  async pauseBreak(candidateId: string): Promise<BreakTimer | null> {
    const doc = await PreparationSessionModel.findOne({
      candidateId,
      status: { $in: ['in_progress', 'not_started'] },
    }).lean();
    if (!doc) return null;

    const bt = (doc as Record<string, unknown>).breakTimer as Record<string, unknown> || {};
    const startedAt = bt.startedAt ? new Date(bt.startedAt as string).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - startedAt) / 60000);
    const remaining = Math.max(0, ((bt.remaining || bt.duration || 0) as number) - elapsed);

    await PreparationSessionModel.findOneAndUpdate(
      { id: (doc as Record<string, unknown>).id as string },
      {
        $set: {
          'breakTimer.isRunning': false,
          'breakTimer.pausedAt': new Date(),
          'breakTimer.remaining': remaining,
        },
      },
      { strict: false }
    );

    return {
      interviewId: candidateId,
      totalDuration: (bt.duration as number) || 0,
      breakDuration: (bt.duration as number) || 0,
      breaksTaken: 0,
      startTime: (bt.startedAt as Date) || new Date(),
      endTime: new Date(),
      isActive: false,
    };
  }

  async resumeBreak(candidateId: string): Promise<BreakTimer | null> {
    const doc = await PreparationSessionModel.findOne({
      candidateId,
      status: { $in: ['in_progress', 'not_started'] },
    }).lean();
    if (!doc) return null;

    const bt = (doc as Record<string, unknown>).breakTimer as Record<string, unknown> || {};

    await PreparationSessionModel.findOneAndUpdate(
      { id: (doc as Record<string, unknown>).id as string },
      {
        $set: {
          'breakTimer.isRunning': true,
          'breakTimer.startedAt': new Date(),
          'breakTimer.pausedAt': null,
        },
      },
      { strict: false }
    );

    return {
      interviewId: candidateId,
      totalDuration: (bt.duration as number) || 0,
      breakDuration: (bt.duration as number) || 0,
      breaksTaken: 0,
      startTime: new Date(),
      isActive: true,
    };
  }

  async getBreakStatus(candidateId: string): Promise<{ remaining: number; isRunning: boolean; totalDuration: number } | null> {
    const doc = await PreparationSessionModel.findOne({
      candidateId,
      status: { $in: ['in_progress', 'not_started'] },
    }).lean();
    if (!doc) return null;

    const bt = (doc as Record<string, unknown>).breakTimer as Record<string, unknown> || {};
    const remaining = (bt.remaining || bt.duration || 0) as number;

    return {
      remaining,
      isRunning: (bt.isRunning as boolean) || false,
      totalDuration: (bt.duration as number) || 0,
    };
  }

  async getSampleQuestions(role?: string): Promise<PreparationQuestion[]> {
    if (role) {
      const sessions = await PreparationSessionModel.find({ role })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();
      if (sessions.length > 0 && sessions[0].sampleQuestions.length > 0) {
        return this.getQuestionsFromDoc(sessions[0]);
      }
    }
    return [...DEFAULT_SAMPLE_QUESTIONS];
  }

  private docToSession(doc: Record<string, unknown>): PreparationSession {
    return {
      id: doc.id as string,
      userId: (doc.userId as string) || (doc.candidateId as string),
      role: doc.role as string,
      status: this.mapStatus(doc.status as string),
      systemCheck: (doc.systemCheck as SystemCheckResult) || null,
      sampleQuestions: this.getQuestionsFromDoc(doc),
      currentQuestionIndex: (doc.currentQuestionIndex as number) || 0,
      startedAt: (doc.startedAt as Date) || (doc.createdAt as Date),
      completedAt: doc.completedAt as Date | undefined,
    };
  }

  private getQuestionsFromDoc(doc: Record<string, unknown>): PreparationQuestion[] {
    const questions = doc.sampleQuestions as Array<Record<string, unknown>> || [];
    return questions.map(q => ({
      id: q.id as string,
      question: q.question as string,
      type: (q.type || q.category || 'behavioral') as PreparationQuestion['type'],
      difficulty: (q.difficulty || 'medium') as PreparationQuestion['difficulty'],
      sampleAnswer: q.sampleAnswer as string | undefined,
      tips: q.tips as string[] | undefined,
    }));
  }

  private mapStatus(status: string): PreparationSession['status'] {
    switch (status) {
      case 'pending':
        return 'not_started';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'cancelled':
      case 'failed':
        return 'failed';
      default:
        return 'not_started';
    }
  }

  private getQuestionsForRole(role: string): PreparationQuestion[] {
    return [...DEFAULT_SAMPLE_QUESTIONS];
  }
}

export const preparationService = new PreparationService();
export default preparationService;
