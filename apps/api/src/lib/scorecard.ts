import { v4 as uuidv4 } from 'uuid';
import { ScorecardModel } from '../models/Scorecard';
import { ScorecardTemplateModel } from '../models/ScorecardTemplate';

export type ScorecardStatus = 'draft' | 'submitted' | 'reviewed';

export interface ScoreCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface ScoreEntry {
  criterionId: string;
  score: number;
  comments: string;
}

export interface ScorecardTemplate {
  id: string;
  name: string;
  description: string;
  role: string;
  criteria: ScoreCriterion[];
  createdBy: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface Scorecard {
  id: string;
  interviewId: string;
  candidateId: string;
  interviewerId: string;
  templateId: string;
  templateName: string;
  status: ScorecardStatus;
  scores: ScoreEntry[];
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  overallRating: 'poor' | 'below-average' | 'average' | 'good' | 'excellent';
  strengths: string[];
  weaknesses: string[];
  recommendation: 'reject' | 'no-hire' | 'neutral' | 'hire' | 'strong-hire';
  notes: string;
  timestampNotes: TimestampNote[];
  createdAt: Date;
  submittedAt?: Date;
}

export interface TimestampNote {
  id: string;
  timestamp: number;
  content: string;
  category: 'important' | 'question' | 'answer' | 'observation' | 'follow-up';
  createdAt: Date;
}

class ScorecardService {
  async getTemplates(role?: string): Promise<ScorecardTemplate[]> {
    const filter: Record<string, unknown> = {};
    if (role) filter.role = { $regex: role, $options: 'i' };
    const docs = await ScorecardTemplateModel.find(filter).lean();
    return docs.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description || '',
      role: (d as any).role || 'General',
      criteria: d.criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        weight: c.weight,
        maxScore: c.maxScore,
      })),
      createdBy: d.createdBy,
      isDefault: false,
      createdAt: d.createdAt,
    }));
  }

  async getTemplate(id: string): Promise<ScorecardTemplate | null> {
    const doc = await ScorecardTemplateModel.findOne({ id }).lean();
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description || '',
      role: (doc as any).role || 'General',
      criteria: doc.criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        weight: c.weight,
        maxScore: c.maxScore,
      })),
      createdBy: doc.createdBy,
      isDefault: false,
      createdAt: doc.createdAt,
    };
  }

  async createTemplate(data: Partial<ScorecardTemplate> & { name: string; criteria: ScoreCriterion[]; createdBy: string }): Promise<ScorecardTemplate> {
    const doc = await ScorecardTemplateModel.create({
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      criteria: data.criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        maxScore: c.maxScore,
        weight: c.weight,
      })),
      createdBy: data.createdBy,
    });
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description || '',
      role: (doc as any).role || 'General',
      criteria: doc.criteria.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        weight: c.weight,
        maxScore: c.maxScore,
      })),
      createdBy: doc.createdBy,
      isDefault: false,
      createdAt: doc.createdAt,
    };
  }

  async createScorecard(
    interviewId: string,
    candidateId: string,
    interviewerId: string,
    templateId: string
  ): Promise<Scorecard | null> {
    const template = await ScorecardTemplateModel.findOne({ id: templateId }).lean();
    if (!template) return null;

    const maxPossibleScore = template.criteria.reduce((sum, c) => sum + c.maxScore * c.weight, 0);
    const doc = await ScorecardModel.create({
      id: uuidv4(),
      interviewId,
      candidateId,
      interviewerId,
      templateId,
      scores: template.criteria.map(c => ({
        criterionId: c.id,
        criterionName: c.name,
        score: 0,
        maxScore: c.maxScore,
      })),
      totalScore: 0,
      maxTotalScore: maxPossibleScore,
      percentageScore: 0,
      status: 'draft',
    });

    return {
      id: doc.id,
      interviewId,
      candidateId,
      interviewerId,
      templateId,
      templateName: template.name,
      status: 'draft',
      scores: doc.scores.map(s => ({
        criterionId: s.criterionId,
        score: s.score,
        comments: s.comment || '',
      })),
      totalScore: 0,
      maxPossibleScore,
      percentage: 0,
      overallRating: 'average',
      strengths: [],
      weaknesses: [],
      recommendation: 'neutral',
      notes: '',
      timestampNotes: [],
      createdAt: doc.createdAt,
    };
  }

  async getScorecard(id: string): Promise<Scorecard | null> {
    const doc = await ScorecardModel.findOne({ id }).lean();
    if (!doc) return null;
    return this.docToScorecard(doc);
  }

  async updateScorecard(id: string, updates: Partial<Scorecard>): Promise<Scorecard | null> {
    const setFields: Record<string, unknown> = {};
    if (updates.status) setFields.status = updates.status;
    if (updates.notes !== undefined) setFields.notes = updates.notes;
    if (updates.submittedAt) setFields.submittedAt = updates.submittedAt;
    if (updates.scores) {
      setFields.scores = updates.scores.map(s => ({
        criterionId: s.criterionId,
        criterionName: '',
        score: s.score,
        maxScore: 5,
        comment: s.comments,
      }));
    }
    const doc = await ScorecardModel.findOneAndUpdate(
      { id },
      { $set: setFields },
      { new: true }
    ).lean();
    if (!doc) return null;
    return this.docToScorecard(doc);
  }

  async addScoreEntry(scorecardId: string, entry: ScoreEntry): Promise<Scorecard | null> {
    const scorecard = await ScorecardModel.findOne({ id: scorecardId });
    if (!scorecard) return null;

    const idx = scorecard.scores.findIndex(s => s.criterionId === entry.criterionId);
    if (idx !== -1) {
      scorecard.scores[idx].score = entry.score;
      scorecard.scores[idx].comment = entry.comments;
    } else {
      scorecard.scores.push({
        criterionId: entry.criterionId,
        criterionName: '',
        score: entry.score,
        maxScore: 5,
        comment: entry.comments,
      });
    }

    scorecard.totalScore = scorecard.scores.reduce((sum, s) => sum + s.score, 0);
    scorecard.percentageScore = scorecard.maxTotalScore > 0
      ? (scorecard.totalScore / scorecard.maxTotalScore) * 100
      : 0;

    await scorecard.save();
    return this.docToScorecard(scorecard.toObject());
  }

  async addTimestampNote(
    scorecardId: string,
    content: string,
    timestamp: number,
    category: TimestampNote['category']
  ): Promise<Scorecard | null> {
    const scorecard = await ScorecardModel.findOne({ id: scorecardId });
    if (!scorecard) return null;
    const note = { id: uuidv4(), content, timestamp, category, createdAt: new Date() };
    const existing = (scorecard as any).timestampNotes || [];
    existing.push(note);
    await ScorecardModel.updateOne({ id: scorecardId }, { $set: { timestampNotes: existing } });
    return this.getScorecard(scorecardId);
  }

  async submitScorecard(id: string): Promise<Scorecard | null> {
    const doc = await ScorecardModel.findOneAndUpdate(
      { id },
      { $set: { status: 'submitted', submittedAt: new Date() } },
      { new: true }
    ).lean();
    if (!doc) return null;
    return this.docToScorecard(doc);
  }

  async getInterviewScorecards(interviewId: string): Promise<Scorecard[]> {
    const docs = await ScorecardModel.find({ interviewId }).lean();
    return docs.map(d => this.docToScorecard(d));
  }

  async getCandidateScorecards(candidateId: string): Promise<Scorecard[]> {
    const docs = await ScorecardModel.find({ candidateId }).lean();
    return docs.map(d => this.docToScorecard(d));
  }

  async getAverageScore(candidateId: string): Promise<number> {
    const docs = await ScorecardModel.find({ candidateId, status: 'submitted' }).lean();
    if (docs.length === 0) return 0;
    return docs.reduce((sum, d) => sum + (d.percentageScore || 0), 0) / docs.length;
  }

  async getInterviewsWithScorecards(): Promise<string[]> {
    const docs = await ScorecardModel.find().distinct('interviewId');
    return docs;
  }

  private docToScorecard(doc: any): Scorecard {
    const templateName = doc.templateName || '';
    const maxPossibleScore = doc.maxTotalScore || doc.scores.reduce((sum: number, s: any) => sum + (s.maxScore || 5), 0);
    const percentage = doc.percentageScore || (maxPossibleScore > 0 ? (doc.totalScore / maxPossibleScore) * 100 : 0);
    return {
      id: doc.id,
      interviewId: doc.interviewId,
      candidateId: doc.candidateId,
      interviewerId: doc.interviewerId,
      templateId: doc.templateId,
      templateName,
      status: doc.status === 'approved' ? 'submitted' : doc.status,
      scores: (doc.scores || []).map((s: any) => ({
        criterionId: s.criterionId,
        score: s.score,
        comments: s.comment || '',
      })),
      totalScore: doc.totalScore || 0,
      maxPossibleScore,
      percentage,
      overallRating: this.getOverallRating(percentage),
      strengths: (doc as any).strengths || [],
      weaknesses: (doc as any).weaknesses || [],
      recommendation: (doc as any).recommendation || 'neutral',
      notes: doc.notes || '',
      timestampNotes: (doc as any).timestampNotes || [],
      createdAt: doc.createdAt,
      submittedAt: doc.submittedAt,
    };
  }

  private getOverallRating(percentage: number): Scorecard['overallRating'] {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 60) return 'average';
    if (percentage >= 40) return 'below-average';
    return 'poor';
  }
}

export const scorecardService = new ScorecardService();
export default scorecardService;
