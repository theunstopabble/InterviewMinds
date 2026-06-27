import { v4 as uuidv4 } from 'uuid';
import { PanelInterviewModel } from '../models/PanelInterview';

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

function toPanelInterview(doc: Record<string, any> | null): PanelInterview | null {
  if (!doc) return null;
  const { _id, __v, updatedAt, ...rest } = doc;
  return rest as PanelInterview;
}

function toPanelInterviews(docs: Record<string, any>[]): PanelInterview[] {
  return docs.map(doc => {
    const { _id, __v, updatedAt, ...rest } = doc;
    return rest as PanelInterview;
  });
}

class PanelInterviewService {
  private activeSessions: Map<string, Set<string>> = new Map();

  async createPanelInterview(
    title: string,
    candidateId: string,
    candidateName: string,
    candidateEmail: string,
    role: string,
    scheduledTime: Date,
    duration: number,
    createdBy: string,
    initialPanelists: { name: string; email: string; role: string }[] = []
  ): Promise<PanelInterview> {
    const doc = new PanelInterviewModel({
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
    });

    await doc.save();
    return toPanelInterview(doc.toObject())!;
  }

  async addPanelist(
    panelId: string,
    name: string,
    email: string,
    role: string
  ): Promise<Panelist | null> {
    const existing = await PanelInterviewModel.findOne(
      { id: panelId, 'panelists.email': email }
    ).lean();
    if (existing) {
      const panelist = existing.panelists.find(p => p.email === email) as Panelist | undefined;
      return panelist || null;
    }

    const newPanelist: Panelist = {
      id: uuidv4(),
      name,
      email,
      role,
      companyId: '',
    };

    const doc = await PanelInterviewModel.findOneAndUpdate(
      { id: panelId },
      { $push: { panelists: newPanelist } },
      { new: true }
    ).lean();

    if (!doc) return null;
    return newPanelist;
  }

  async removePanelist(panelId: string, panelistId: string): Promise<boolean> {
    const doc = await PanelInterviewModel.findOneAndUpdate(
      { id: panelId },
      { $pull: { panelists: { id: panelistId } } },
      { new: true }
    ).lean();
    return doc !== null;
  }

  async joinSession(panelId: string, panelistId: string): Promise<PanelInterview | null> {
    const doc = await PanelInterviewModel.findOne({ id: panelId });
    if (!doc) return null;

    const panelist = doc.panelists.find(p => p.id === panelistId);
    if (!panelist) return null;

    panelist.joinedAt = new Date();

    if (!this.activeSessions.has(panelId)) {
      this.activeSessions.set(panelId, new Set());
    }
    this.activeSessions.get(panelId)!.add(panelistId);

    if (doc.status === 'scheduled') {
      const allPanelistsJoined = doc.panelists.every(p => p.joinedAt);
      if (allPanelistsJoined) {
        doc.status = 'in_progress';
        doc.startedAt = new Date();
      }
    }

    await doc.save();
    return toPanelInterview(doc.toObject());
  }

  async leaveSession(panelId: string, panelistId: string): Promise<boolean> {
    const doc = await PanelInterviewModel.findOneAndUpdate(
      { id: panelId, 'panelists.id': panelistId },
      { $set: { 'panelists.$.leftAt': new Date() } },
      { new: true }
    );

    this.activeSessions.get(panelId)?.delete(panelistId);
    return doc !== null;
  }

  async sendMessage(
    panelId: string,
    senderId: string,
    senderName: string,
    content: string,
    isPrivate: boolean = false
  ): Promise<PanelMessage | null> {
    const message: PanelMessage = {
      id: uuidv4(),
      senderId,
      senderName,
      content,
      timestamp: new Date(),
      isPrivate,
    };

    const doc = await PanelInterviewModel.findOneAndUpdate(
      { id: panelId },
      { $push: { messages: message } },
      { new: true }
    ).lean();

    if (!doc) return null;
    return message;
  }

  async submitScore(
    panelId: string,
    interviewerId: string,
    score: number,
    feedback: string
  ): Promise<PanelInterview | null> {
    const doc = await PanelInterviewModel.findOne({ id: panelId });
    if (!doc) return null;

    const existingIndex = doc.scores.findIndex(s => s.interviewerId === interviewerId);

    const panelScore: PanelScore = {
      interviewerId,
      score,
      feedback,
      submittedAt: new Date(),
    };

    if (existingIndex !== -1) {
      doc.scores[existingIndex] = panelScore;
    } else {
      doc.scores.push(panelScore);
    }

    if (doc.scores.length === doc.panelists.length) {
      doc.finalScore = this.calculateFinalScore(doc.scores);
      doc.recommendation = this.getRecommendation(doc.finalScore);
    }

    await doc.save();
    return toPanelInterview(doc.toObject());
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

  async completePanelInterview(panelId: string): Promise<PanelInterview | null> {
    const doc = await PanelInterviewModel.findOne({ id: panelId, status: 'in_progress' });
    if (!doc) return null;

    doc.status = 'completed';
    doc.completedAt = new Date();

    if (!doc.finalScore && doc.scores.length > 0) {
      doc.finalScore = this.calculateFinalScore(doc.scores);
      doc.recommendation = this.getRecommendation(doc.finalScore);
    }

    await doc.save();
    return toPanelInterview(doc.toObject());
  }

  async cancelPanelInterview(panelId: string): Promise<boolean> {
    const doc = await PanelInterviewModel.findOneAndUpdate(
      { id: panelId, status: { $ne: 'completed' } },
      { $set: { status: 'cancelled' } },
      { new: true }
    ).lean();
    return doc !== null;
  }

  async getPanelInterview(panelId: string): Promise<PanelInterview | null> {
    const doc = await PanelInterviewModel.findOne({ id: panelId }).lean();
    return toPanelInterview(doc);
  }

  getActivePanelists(panelId: string): string[] {
    return Array.from(this.activeSessions.get(panelId) || []);
  }

  async getPanelInterviewsByCandidate(candidateId: string): Promise<PanelInterview[]> {
    const docs = await PanelInterviewModel.find({ candidateId })
      .sort({ scheduledTime: -1 })
      .lean();
    return toPanelInterviews(docs);
  }

  async getPanelInterviewsByPanelist(panelistId: string): Promise<PanelInterview[]> {
    const docs = await PanelInterviewModel.find({ 'panelists.id': panelistId })
      .sort({ scheduledTime: -1 })
      .lean();
    return toPanelInterviews(docs);
  }

  async getUpcomingPanelInterviews(): Promise<PanelInterview[]> {
    const now = new Date();
    const docs = await PanelInterviewModel.find({
      status: 'scheduled',
      scheduledTime: { $gt: now },
    })
      .sort({ scheduledTime: 1 })
      .lean();
    return toPanelInterviews(docs);
  }
}

export const panelInterviewService = new PanelInterviewService();
export default panelInterviewService;
