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
}

// 2. Chat Message Structure
export interface ChatMessage {
  role: "user" | "model" | "system";
  text: string;
  timestamp: Date;
}

// 3. Feedback Structure
export interface IFeedback {
  rating: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

// 4. Interview Session Structure
export interface IInterview {
  _id?: string;
  userId: string;
  resumeId: string;
  conversation: ChatMessage[];
  feedback?: IFeedback;
  status: "ongoing" | "completed";
  createdAt: Date;
}
