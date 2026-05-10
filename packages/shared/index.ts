// packages/shared/index.ts

// 1. Resume Structure
export interface ResumeChunk {
  text: string;
  embedding: number[];
}

export interface IResume {
  _id?: string;
  userId: string;
  fileName: string;
  content: string;
  chunks?: ResumeChunk[];
  createdAt: Date;
  verifiedAt?: Date;
  verificationStatus?: VerificationStatus;
}

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'unverified';

// 2. Vector Embedding Type (compatible with MongoDB)
export type VectorEmbedding = number[];

// 3. Chat Message Structure
export interface ChatMessage {
  role: "user" | "model" | "system";
  text: string;
  timestamp: Date;
}

// 4. Feedback Structure
export interface IFeedback {
  rating: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

// 5. Interview Session Structure
export interface IInterview {
  _id?: string;
  userId: string;
  resumeId: string;
  conversation: ChatMessage[];
  feedback?: IFeedback;
  status: "ongoing" | "completed";
  createdAt: Date;
}

// 6. Verification Types
export interface ExtractedEntity {
  type: 'company' | 'school' | 'skill' | 'certification' | 'job_title';
  name: string;
  confidence: number;
  rawText: string;
  verified: boolean;
}

export interface VerificationResult {
  resumeId: string;
  overallScore: number; // 0-100
  entities: ExtractedEntity[];
  timelineAnalysis: {
    gaps: { start: Date; end: Date; reason?: string }[];
    overlapping: { period: string; items: string[] }[];
    hasImpossibilities: boolean;
  };
  skillGapAnalysis: {
    claimed: string[];
    verified: string[];
    unverified: string[];
    missingForRole: string[];
  };
  redFlags: {
    type: 'inconsistency' | 'timeline_gap' | 'unverified_claim' | 'exaggeration';
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string;
  }[];
  createdAt: Date;
}

// 7. Answer Evaluation Types
export interface AnswerEvaluation {
  questionId: string;
  transcript: string;
  evaluation: {
    contentScore: number;
    technicalAccuracy: number;
    clarity: number;
    depthScore: number;
    starMethod: { situation: number; task: number; action: number; result: number };
  };
  redFlags: {
    type: 'vague' | 'inconsistent' | 'memorized' | 'copied' | 'over_confident' | 'under_confident';
    description: string;
    timestamp: string;
  }[];
  suggestedFollowUp?: string;
  overallScore: number;
  feedback: string;
}

// 8. Question Generation Types
export interface QuestionTemplate {
  id: string;
  text: string;
  competency: string;
  difficulty: 'entry' | 'mid' | 'senior' | 'lead';
  evaluationCriteria: string[];
  modelAnswer: string;
  followUpPrompts: string[];
}

export interface GeneratedAssessment {
  jobRole: string;
  questions: QuestionTemplate[];
  totalDuration: number; // minutes
  passingScore: number;
}
