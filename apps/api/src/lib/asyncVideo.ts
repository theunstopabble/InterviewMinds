import { v4 as uuidv4 } from 'uuid';

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

class AsyncVideoService {
  private interviews: Map<string, AsyncInterview> = new Map();

  createAsyncInterview(
    title: string,
    description: string,
    candidateId: string,
    candidateEmail: string,
    companyId: string,
    role: string,
    questions: AsyncQuestion[]
  ): AsyncInterview {
    const interview: AsyncInterview = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.interviews.set(interview.id, interview);
    return interview;
  }

  sendToCandidate(interviewId: string): AsyncInterview | null {
    const interview = this.interviews.get(interviewId);
    if (!interview || interview.status !== 'draft') return null;

    interview.status = 'sent';
    interview.sentAt = new Date();
    interview.updatedAt = new Date();

    this.interviews.set(interviewId, interview);
    return interview;
  }

  startInterview(interviewId: string, candidateId: string): AsyncInterview | null {
    const interview = this.interviews.get(interviewId);
    if (!interview || interview.candidateId !== candidateId) return null;

    if (interview.status === 'expired' || interview.status === 'completed') return null;

    interview.status = 'in-progress';
    interview.startedAt = new Date();
    interview.updatedAt = new Date();

    this.interviews.set(interviewId, interview);
    return interview;
  }

  saveAnswer(
    interviewId: string,
    questionId: string,
    answer: Omit<AsyncAnswer, 'questionId' | 'recordedAt'>
  ): AsyncInterview | null {
    const interview = this.interviews.get(interviewId);
    if (!interview || interview.status !== 'in-progress') return null;

    const question = interview.questions.find(q => q.id === questionId);
    if (!question) return null;

    const existingAnswerIndex = interview.answers.findIndex(a => a.questionId === questionId);
    const newAnswer: AsyncAnswer = {
      questionId,
      ...answer,
      recordedAt: new Date(),
    };

    if (existingAnswerIndex !== -1) {
      interview.answers[existingAnswerIndex] = newAnswer;
    } else {
      interview.answers.push(newAnswer);
    }

    interview.updatedAt = new Date();
    this.interviews.set(interviewId, interview);
    return interview;
  }

  completeInterview(interviewId: string, candidateId: string): AsyncInterview | null {
    const interview = this.interviews.get(interviewId);
    if (!interview || interview.candidateId !== candidateId) return null;

    if (interview.startedAt) {
      interview.timeSpent = (new Date().getTime() - interview.startedAt.getTime()) / 1000;
    }

    interview.status = 'completed';
    interview.completedAt = new Date();
    interview.updatedAt = new Date();

    this.interviews.set(interviewId, interview);
    return interview;
  }

  getInterview(id: string): AsyncInterview | null {
    return this.interviews.get(id) || null;
  }

  getCandidateInterviews(candidateId: string): AsyncInterview[] {
    return Array.from(this.interviews.values())
      .filter(i => i.candidateId === candidateId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getCompanyInterviews(companyId: string): AsyncInterview[] {
    return Array.from(this.interviews.values())
      .filter(i => i.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPendingInterviews(candidateId: string): AsyncInterview[] {
    return Array.from(this.interviews.values())
      .filter(i => i.candidateId === candidateId && (i.status === 'sent' || i.status === 'in-progress'))
      .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());
  }

  getCompletedInterviews(candidateId: string): AsyncInterview[] {
    return Array.from(this.interviews.values())
      .filter(i => i.candidateId === candidateId && i.status === 'completed');
  }

  checkExpiredInterviews(): number {
    let expired = 0;
    const now = new Date();

    for (const [id, interview] of this.interviews.entries()) {
      if (now >= interview.expiresAt && (interview.status === 'sent' || interview.status === 'in-progress')) {
        interview.status = 'expired';
        interview.updatedAt = new Date();
        this.interviews.set(id, interview);
        expired++;
      }
    }

    return expired;
  }

  getProgress(interviewId: string): { answered: number; total: number; percentage: number } {
    const interview = this.interviews.get(interviewId);
    if (!interview) return { answered: 0, total: 0, percentage: 0 };

    const answered = interview.answers.length;
    const total = interview.questions.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, total, percentage };
  }

  canRetake(interviewId: string, questionId: string, candidateId: string): boolean {
    const interview = this.interviews.get(interviewId);
    if (!interview || interview.candidateId !== candidateId) return false;

    const question = interview.questions.find(q => q.id === questionId);
    if (!question) return false;

    const existingAnswer = interview.answers.find(a => a.questionId === questionId);
    if (!existingAnswer) return true;

    return existingAnswer.retakeCount < question.maxRetakes;
  }

  getTimeRemaining(interviewId: string): number {
    const interview = this.interviews.get(interviewId);
    if (!interview) return 0;

    if (interview.status === 'completed' || interview.status === 'expired') return 0;

    const now = new Date();
    const remaining = interview.expiresAt.getTime() - now.getTime();
    return Math.max(0, remaining);
  }
}

export const asyncVideoService = new AsyncVideoService();
export default asyncVideoService;