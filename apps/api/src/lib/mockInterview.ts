import { v4 as uuidv4 } from 'uuid';

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
  private mockInterviews: Map<string, MockInterview> = new Map();

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

  createMockInterview(
    userId: string,
    role: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate',
    questionCount: number = 4
  ): MockInterview {
    const questions = this.getRandomQuestions(role, difficulty, questionCount);

    const mockInterview: MockInterview = {
      id: uuidv4(),
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
    };

    this.mockInterviews.set(mockInterview.id, mockInterview);
    return mockInterview;
  }

  private getRandomQuestions(role: string, difficulty: string, count: number): MockQuestion[] {
    const shuffled = [...this.defaultQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  startMockInterview(mockId: string): MockInterview | null {
    const mockInterview = this.mockInterviews.get(mockId);
    if (!mockInterview || mockInterview.status !== 'not_started') {
      return null;
    }

    mockInterview.status = 'in_progress';
    this.mockInterviews.set(mockId, mockInterview);
    return mockInterview;
  }

  submitAnswer(
    mockId: string,
    questionId: string,
    answer: string,
    code?: string,
    responseTime: number = 0
  ): MockInterview | null {
    const mockInterview = this.mockInterviews.get(mockId);
    if (!mockInterview || mockInterview.status !== 'in_progress') {
      return null;
    }

    const existingAnswerIndex = mockInterview.answers.findIndex(a => a.questionId === questionId);
    const mockAnswer: MockAnswer = {
      questionId,
      answer,
      code,
      responseTime,
      timestamp: new Date(),
    };

    if (existingAnswerIndex !== -1) {
      mockInterview.answers[existingAnswerIndex] = mockAnswer;
    } else {
      mockInterview.answers.push(mockAnswer);
    }

    this.mockInterviews.set(mockId, mockInterview);
    return mockInterview;
  }

  completeMockInterview(mockId: string): MockInterview | null {
    const mockInterview = this.mockInterviews.get(mockId);
    if (!mockInterview || mockInterview.status !== 'in_progress') {
      return null;
    }

    mockInterview.status = 'completed';
    mockInterview.completedAt = new Date();
    mockInterview.totalDuration = Math.floor(
      (new Date().getTime() - mockInterview.startedAt.getTime()) / 1000
    );

    this.mockInterviews.set(mockId, mockInterview);
    return mockInterview;
  }

  generateFeedback(mockId: string): MockFeedback | null {
    const mockInterview = this.mockInterviews.get(mockId);
    if (!mockInterview || mockInterview.status !== 'completed') {
      return null;
    }

    const totalQuestions = mockInterview.questions.length;
    const answeredQuestions = mockInterview.answers.length;
    
    const baseScore = Math.round((answeredQuestions / totalQuestions) * 70);
    const completionBonus = answeredQuestions === totalQuestions ? 20 : 0;
    const durationPenalty = mockInterview.totalDuration > 1800 ? 10 : 0;
    
    const overallScore = Math.min(100, Math.max(0, baseScore + completionBonus - durationPenalty));

    const detailedScores = mockInterview.questions.map(q => {
      const answer = mockInterview.answers.find(a => a.questionId === q.id);
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
    const improvements = this.extractImprovements(detailedScores, mockInterview.questions);

    const feedback: MockFeedback = {
      overallScore,
      strengths,
      improvements,
      detailedScores,
      generatedAt: new Date(),
    };

    mockInterview.feedback = feedback;
    mockInterview.feedbackStatus = 'generated';
    this.mockInterviews.set(mockId, mockInterview);

    return feedback;
  }

  private getQuestionFeedback(question: MockQuestion, answer: MockAnswer | undefined, score: number): string {
    if (!answer) return 'No answer provided';
    
    if (score >= 70) {
      return 'Excellent response! Well-structured and comprehensive.';
    } else if (score >= 40) {
      return 'Good attempt. Consider adding more specific examples.';
    } else {
      return 'Needs improvement. Try to be more detailed and structured.';
    }
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

  getMockInterview(mockId: string): MockInterview | null {
    return this.mockInterviews.get(mockId) || null;
  }

  getUserMockInterviews(userId: string): MockInterview[] {
    return Array.from(this.mockInterviews.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  deleteMockInterview(mockId: string): boolean {
    return this.mockInterviews.delete(mockId);
  }

  getPracticeTips(role: string): string[] {
    return [
      'Practice STAR method for behavioral questions',
      'Review fundamental data structures and algorithms',
      'Think aloud during problem-solving',
      'Time yourself to improve speed',
      'Review your answers after completion',
      'Focus on clarity and structure',
    ];
  }
}

export const mockInterviewService = new MockInterviewService();
export default mockInterviewService;