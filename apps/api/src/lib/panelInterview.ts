import { v4 as uuidv4 } from 'uuid';

export type PanelStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Panelist {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  joinedAt?: Date;
  leftAt?: Date;
}

export interface PanelMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isPrivate: boolean;
}

export interface PanelScore {
  interviewerId: string;
  score: number;
  feedback: string;
  submittedAt: Date;
}

export interface PanelInterview {
  id: string;
  title: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  scheduledTime: Date;
  duration: number;
  status: PanelStatus;
  panelists: Panelist[];
  messages: PanelMessage[];
  scores: PanelScore[];
  finalScore?: number;
  recommendation?: 'strong_hire' | 'hire' | 'neutral' | 'no_hire' | 'strong_no_hire';
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

class PanelInterviewService {
  private panelInterviews: Map<string, PanelInterview> = new Map();
  private activeSessions: Map<string, Set<string>> = new Map();

  createPanelInterview(
    title: string,
    candidateId: string,
    candidateName: string,
    candidateEmail: string,
    role: string,
    scheduledTime: Date,
    duration: number,
    createdBy: string,
    initialPanelists: { name: string; email: string; role: string }[] = []
  ): PanelInterview {
    const panelInterview: PanelInterview = {
      id: uuidv4(),
      title,
      candidateId,
      candidateName,
      candidateEmail,
      role,
      scheduledTime,
      duration,
      status: 'scheduled',
      panelists: initialPanelists.map(p => ({
        id: uuidv4(),
        name: p.name,
        email: p.email,
        role: p.role,
        companyId: '',
      })),
      messages: [],
      scores: [],
      createdBy,
      createdAt: new Date(),
    };

    this.panelInterviews.set(panelInterview.id, panelInterview);
    return panelInterview;
  }

  addPanelist(
    panelId: string,
    name: string,
    email: string,
    role: string
  ): Panelist | null {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview) return null;

    const existingPanelist = panelInterview.panelists.find(p => p.email === email);
    if (existingPanelist) return existingPanelist;

    const newPanelist: Panelist = {
      id: uuidv4(),
      name,
      email,
      role,
      companyId: '',
    };

    panelInterview.panelists.push(newPanelist);
    this.panelInterviews.set(panelId, panelInterview);

    return newPanelist;
  }

  removePanelist(panelId: string, panelistId: string): boolean {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview) return false;

    const index = panelInterview.panelists.findIndex(p => p.id === panelistId);
    if (index === -1) return false;

    panelInterview.panelists.splice(index, 1);
    this.panelInterviews.set(panelId, panelInterview);

    return true;
  }

  joinSession(panelId: string, panelistId: string): PanelInterview | null {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview) return null;

    const panelist = panelInterview.panelists.find(p => p.id === panelistId);
    if (!panelist) return null;

    panelist.joinedAt = new Date();

    if (!this.activeSessions.has(panelId)) {
      this.activeSessions.set(panelId, new Set());
    }
    this.activeSessions.get(panelId)!.add(panelistId);

    if (panelInterview.status === 'scheduled') {
      const allPanelistsJoined = panelInterview.panelists.every(p => p.joinedAt);
      if (allPanelistsJoined) {
        panelInterview.status = 'in_progress';
        panelInterview.startedAt = new Date();
      }
    }

    this.panelInterviews.set(panelId, panelInterview);
    return panelInterview;
  }

  leaveSession(panelId: string, panelistId: string): boolean {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview) return false;

    const panelist = panelInterview.panelists.find(p => p.id === panelistId);
    if (!panelist) return false;

    panelist.leftAt = new Date();

    this.activeSessions.get(panelId)?.delete(panelistId);

    return true;
  }

  sendMessage(
    panelId: string,
    senderId: string,
    senderName: string,
    content: string,
    isPrivate: boolean = false
  ): PanelMessage | null {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview) return null;

    const message: PanelMessage = {
      id: uuidv4(),
      senderId,
      senderName,
      content,
      timestamp: new Date(),
      isPrivate,
    };

    panelInterview.messages.push(message);
    this.panelInterviews.set(panelId, panelInterview);

    return message;
  }

  submitScore(
    panelId: string,
    interviewerId: string,
    score: number,
    feedback: string
  ): PanelInterview | null {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview) return null;

    const existingScoreIndex = panelInterview.scores.findIndex(s => s.interviewerId === interviewerId);
    
    const panelScore: PanelScore = {
      interviewerId,
      score,
      feedback,
      submittedAt: new Date(),
    };

    if (existingScoreIndex !== -1) {
      panelInterview.scores[existingScoreIndex] = panelScore;
    } else {
      panelInterview.scores.push(panelScore);
    }

    if (panelInterview.scores.length === panelInterview.panelists.length) {
      panelInterview.finalScore = this.calculateFinalScore(panelInterview.scores);
      panelInterview.recommendation = this.getRecommendation(panelInterview.finalScore);
    }

    this.panelInterviews.set(panelId, panelInterview);
    return panelInterview;
  }

  private calculateFinalScore(scores: PanelScore[]): number {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, s) => sum + s.score, 0);
    return Math.round(total / scores.length);
  }

  private getRecommendation(score: number): PanelInterview['recommendation'] {
    if (score >= 90) return 'strong_hire';
    if (score >= 75) return 'hire';
    if (score >= 50) return 'neutral';
    if (score >= 30) return 'no_hire';
    return 'strong_no_hire';
  }

  completePanelInterview(panelId: string): PanelInterview | null {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview || panelInterview.status !== 'in_progress') return null;

    panelInterview.status = 'completed';
    panelInterview.completedAt = new Date();

    if (!panelInterview.finalScore && panelInterview.scores.length > 0) {
      panelInterview.finalScore = this.calculateFinalScore(panelInterview.scores);
      panelInterview.recommendation = this.getRecommendation(panelInterview.finalScore);
    }

    this.panelInterviews.set(panelId, panelInterview);
    return panelInterview;
  }

  cancelPanelInterview(panelId: string): boolean {
    const panelInterview = this.panelInterviews.get(panelId);
    if (!panelInterview || panelInterview.status === 'completed') return false;

    panelInterview.status = 'cancelled';
    this.panelInterviews.set(panelId, panelInterview);

    return true;
  }

  getPanelInterview(panelId: string): PanelInterview | null {
    return this.panelInterviews.get(panelId) || null;
  }

  getActivePanelists(panelId: string): string[] {
    return Array.from(this.activeSessions.get(panelId) || []);
  }

  getPanelInterviewsByCandidate(candidateId: string): PanelInterview[] {
    return Array.from(this.panelInterviews.values())
      .filter(p => p.candidateId === candidateId)
      .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  }

  getPanelInterviewsByPanelist(panelistId: string): PanelInterview[] {
    return Array.from(this.panelInterviews.values())
      .filter(p => p.panelists.some(panelist => panelist.id === panelistId))
      .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  }

  getUpcomingPanelInterviews(): PanelInterview[] {
    const now = new Date();
    return Array.from(this.panelInterviews.values())
      .filter(p => p.status === 'scheduled' && new Date(p.scheduledTime) > now)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }
}

export const panelInterviewService = new PanelInterviewService();
export default panelInterviewService;