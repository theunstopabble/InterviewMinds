import { v4 as uuidv4 } from 'uuid';
import { PracticeInterviewModel } from "../models/PracticeInterview";
import { logger } from "./logger";

export type MockStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';
export type MockFeedbackStatus = 'pending' | 'generated';

export interface MockQuestion {
  id: string;
  question: string;
  type: 'behavioral' | 'technical' | 'coding' | 'system-design';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedDuration: number;
  sampleAnswer?: string;
  evaluationCriteria?: string[];
}

export interface MockAnswer {
  questionId: string;
  answer: string;
  audioUrl?: string;
  videoUrl?: string;
  code?: string;
  responseTime: number;
  timestamp: Date;
}

export interface MockFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  detailedScores: {
    questionId: string;
    score: number;
    feedback: string;
  }[];
  generatedAt: Date;
}

export interface MockInterview {
  id: string;
  userId: string;
  role: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  questions: MockQuestion[];
  answers: MockAnswer[];
  status: MockStatus;
  feedbackStatus: MockFeedbackStatus;
  feedback: MockFeedback | null;
  startedAt: Date;
  completedAt?: Date;
  totalDuration: number;
  isRecorded: boolean;
}

class MockInterviewService {
  private defaultQuestions: MockQuestion[] = [
    {
      id: 'mock-1',
      question: 'Tell me about yourself and your journey in tech.',
      type: 'behavioral',
      difficulty: 'easy',
      expectedDuration: 120,
      sampleAnswer: 'A brief overview starting from early career, key milestones, and what brings you here.',
      evaluationCriteria: ['Clarity', 'Relevance', 'Confidence', 'Brevity'],
    },
    {
      id: 'mock-2',
      question: 'Describe a time when you had to deal with a difficult team member. How did you handle it?',
      type: 'behavioral',
      difficulty: 'medium',
      expectedDuration: 180,
      sampleAnswer: 'Use STAR method: Situation, Task, Action, Result. Focus on your approach and the outcome.',
      evaluationCriteria: ['Problem-solving', 'Communication', 'Empathy', 'Results'],
    },
    {
      id: 'mock-3',
      question: 'What is the difference between REST and GraphQL? When would you use each?',
      type: 'technical',
      difficulty: 'medium',
      expectedDuration: 180,
      sampleAnswer: 'REST: Multiple endpoints, over-fetching. GraphQL: Single endpoint, flexible queries. Use REST for simple APIs, GraphQL for complex data requirements.',
      evaluationCriteria: ['Technical accuracy', 'Examples', 'Best practices', 'Performance'],
    },
    {
      id: 'mock-4',
      question: 'How would you design a URL shortening service like bit.ly?',
      type: 'system-design',
      difficulty: 'hard',
      expectedDuration: 300,
      sampleAnswer: 'Cover: API design, database schema, encoding strategy, redirect logic, analytics, scaling considerations.',
      evaluationCriteria: ['Scalability', 'Trade-offs', 'Data model', 'Edge cases'],
    },
  ];

  async createMockInterview(
    userId: string,
    role: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate',
    questionCount: number = 4
  ): Promise<MockInterview> {
    const questions = this.getRandomQuestions(role, difficulty, questionCount);
    const doc = await PracticeInterviewModel.create({
      userId,
      role,
      difficulty,
      questions,
      answers: [],
      status: 'not_started',
      feedbackStatus: 'pending',
      feedback: null,
      startedAt: new Date(),
      totalDuration: 0,
      isRecorded: false,
    });
    return this.toInterface(doc);
  }

  private getRandomQuestions(role: string, difficulty: string, count: number): MockQuestion[] {
    const shuffled = [...this.defaultQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  async startMockInterview(mockId: string): Promise<MockInterview | null> {
    const doc = await PracticeInterviewModel.findByIdAndUpdate(
      mockId,
      { status: 'in_progress' },
      { new: true }
    );
    return doc ? this.toInterface(doc) : null;
  }

  async submitAnswer(
    mockId: string,
    questionId: string,
    answer: string,
    code?: string,
    responseTime: number = 0
  ): Promise<MockInterview | null> {
    const doc = await PracticeInterviewModel.findById(mockId);
    if (!doc || doc.status !== 'in_progress') return null;

    const existingIndex = doc.answers.findIndex((a: any) => a.questionId === questionId);
    const newAnswer: any = { questionId, answer, code, responseTime, timestamp: new Date() };
    if (existingIndex !== -1) {
      doc.answers[existingIndex] = newAnswer;
    } else {
      doc.answers.push(newAnswer);
    }
    await doc.save();
    return this.toInterface(doc);
  }

  async completeMockInterview(mockId: string): Promise<MockInterview | null> {
    const doc = await PracticeInterviewModel.findById(mockId);
    if (!doc || doc.status !== 'in_progress') return null;

    doc.status = 'completed';
    doc.completedAt = new Date();
    doc.totalDuration = Math.floor((new Date().getTime() - doc.startedAt.getTime()) / 1000);
    await doc.save();
    return this.toInterface(doc);
  }

  async generateFeedback(mockId: string): Promise<MockFeedback | null> {
    const doc = await PracticeInterviewModel.findById(mockId);
    if (!doc || doc.status !== 'completed') return null;

    const questions = doc.questions as unknown as MockQuestion[];
    const answers = doc.answers as unknown as MockAnswer[];
    const totalQuestions = questions.length;
    const answeredQuestions = answers.length;

    const baseScore = Math.round((answeredQuestions / totalQuestions) * 70);
    const completionBonus = answeredQuestions === totalQuestions ? 20 : 0;
    const durationPenalty = doc.totalDuration > 1800 ? 10 : 0;

    const overallScore = Math.min(100, Math.max(0, baseScore + completionBonus - durationPenalty));

    const detailedScores = questions.map((q) => {
      const answer = answers.find((a) => a.questionId === q.id);
      const hasAnswer = !!answer;
      const hasCode = !!answer?.code;
      const isComplete = answer && answer.answer.length > 50;

      let score = 0;
      if (hasAnswer) score += 20;
      if (isComplete) score += 30;
      if (q.type === 'coding' && hasCode) score += 30;
      if (q.type === 'system-design' && isComplete) score += 30;

      return {
        questionId: q.id,
        score,
        feedback: this.getQuestionFeedback(q, answer, score),
      };
    });

    const strengths = this.extractStrengths(detailedScores);
    const improvements = this.extractImprovements(detailedScores, questions);

    const feedback: MockFeedback = {
      overallScore,
      strengths,
      improvements,
      detailedScores,
      generatedAt: new Date(),
    };

    doc.feedback = feedback as any;
    doc.feedbackStatus = 'generated';
    await doc.save();

    return feedback;
  }

  private getQuestionFeedback(question: MockQuestion, answer: MockAnswer | undefined, score: number): string {
    if (!answer) return 'No answer provided';
    if (score >= 70) return 'Excellent response! Well-structured and comprehensive.';
    if (score >= 40) return 'Good attempt. Consider adding more specific examples.';
    return 'Needs improvement. Try to be more detailed and structured.';
  }

  private extractStrengths(detailedScores: { questionId: string; score: number }[]): string[] {
    const strengths: string[] = [];
    const highScoring = detailedScores.filter(s => s.score >= 60);
    if (highScoring.length >= 3) strengths.push('Consistent performance across questions');
    if (highScoring.some(s => s.score >= 80)) strengths.push('Strong technical understanding');
    if (detailedScores.every(s => s.score > 0)) strengths.push('Completed all questions');
    return strengths;
  }

  private extractImprovements(detailedScores: { questionId: string; score: number }[], questions: MockQuestion[]): string[] {
    const improvements: string[] = [];
    const lowScoring = detailedScores.filter(s => s.score < 40);
    if (lowScoring.length > 0) improvements.push('Focus on providing more detailed answers');
    if (detailedScores.some(s => s.score === 0)) improvements.push('Answer all questions completely');
    if (questions.some(q => q.type === 'system-design')) improvements.push('Practice system design thinking');
    return improvements;
  }

  async getMockInterview(mockId: string): Promise<MockInterview | null> {
    const doc = await PracticeInterviewModel.findById(mockId).lean();
    return doc ? this.toInterface(doc) : null;
  }

  async getUserMockInterviews(userId: string): Promise<MockInterview[]> {
    const docs = await PracticeInterviewModel.find({ userId }).sort({ startedAt: -1 }).lean();
    return docs.map(d => this.toInterface(d));
  }

  async deleteMockInterview(mockId: string): Promise<boolean> {
    const res = await PracticeInterviewModel.findByIdAndDelete(mockId);
    return !!res;
  }

  getPracticeTips(_role: string): string[] {
    return [
      'Practice STAR method for behavioral questions',
      'Review fundamental data structures and algorithms',
      'Think aloud during problem-solving',
      'Time yourself to improve speed',
      'Review your answers after completion',
      'Focus on clarity and structure',
    ];
  }

  private toInterface(doc: any): MockInterview {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      role: doc.role,
      difficulty: doc.difficulty,
      questions: doc.questions,
      answers: doc.answers,
      status: doc.status,
      feedbackStatus: doc.feedbackStatus,
      feedback: doc.feedback,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      totalDuration: doc.totalDuration,
      isRecorded: doc.isRecorded,
    };
  }
}

export const mockInterviewService = new MockInterviewService();
export default mockInterviewService;