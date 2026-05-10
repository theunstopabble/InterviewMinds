import { v4 as uuidv4 } from 'uuid';

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
  private templates: Map<string, ScorecardTemplate> = new Map();
  private scorecards: Map<string, Scorecard[]> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: ScorecardTemplate[] = [
      {
        id: 'technical-default',
        name: 'Technical Interview',
        description: 'Standard technical evaluation for software engineers',
        role: 'Software Engineer',
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        criteria: [
          { id: 'problem-solving', name: 'Problem Solving', description: 'Ability to approach and solve problems', weight: 1, maxScore: 5 },
          { id: 'coding-skills', name: 'Coding Skills', description: 'Code quality, syntax, efficiency', weight: 1, maxScore: 5 },
          { id: 'data-structures', name: 'Data Structures', description: 'Knowledge of DS fundamentals', weight: 0.8, maxScore: 5 },
          { id: 'algorithms', name: 'Algorithms', description: 'Algorithm design and analysis', weight: 0.8, maxScore: 5 },
          { id: 'communication', name: 'Communication', description: 'Explaining thought process clearly', weight: 0.6, maxScore: 5 },
          { id: 'time-complexity', name: 'Time & Space Complexity', description: 'Understanding of optimization', weight: 0.8, maxScore: 5 },
        ],
      },
      {
        id: 'behavioral-default',
        name: 'Behavioral Interview',
        description: 'Evaluate cultural fit and soft skills',
        role: 'General',
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        criteria: [
          { id: 'leadership', name: 'Leadership', description: 'Past leadership experiences', weight: 1, maxScore: 5 },
          { id: 'teamwork', name: 'Teamwork', description: 'Collaboration abilities', weight: 1, maxScore: 5 },
          { id: 'conflict-resolution', name: 'Conflict Resolution', description: 'Handling disagreements', weight: 0.8, maxScore: 5 },
          { id: 'adaptability', name: 'Adaptability', description: 'Handling change', weight: 0.8, maxScore: 5 },
          { id: 'motivation', name: 'Motivation', description: 'Career goals and drive', weight: 0.6, maxScore: 5 },
          { id: 'culture-fit', name: 'Culture Fit', description: 'Alignment with company values', weight: 1, maxScore: 5 },
        ],
      },
      {
        id: 'system-design-default',
        name: 'System Design Interview',
        description: 'Architecture and design evaluation',
        role: 'Senior Engineer',
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        criteria: [
          { id: 'requirements', name: 'Requirements Gathering', description: 'Clarifying scope and constraints', weight: 1, maxScore: 5 },
          { id: 'scalability', name: 'Scalability', description: 'Handling growth', weight: 1, maxScore: 5 },
          { id: 'data-model', name: 'Data Modeling', description: 'Schema design', weight: 0.8, maxScore: 5 },
          { id: 'api-design', name: 'API Design', description: 'RESTful design', weight: 0.8, maxScore: 5 },
          { id: 'tradeoffs', name: 'Trade-offs', description: 'Understanding pros/cons', weight: 1, maxScore: 5 },
          { id: 'communication', name: 'Communication', description: 'Clear explanation', weight: 0.6, maxScore: 5 },
        ],
      },
      {
        id: 'frontend-default',
        name: 'Frontend Interview',
        description: 'Frontend specific evaluation',
        role: 'Frontend Developer',
        isDefault: true,
        createdBy: 'system',
        createdAt: new Date(),
        criteria: [
          { id: 'html-css', name: 'HTML/CSS', description: 'Markup and styling knowledge', weight: 1, maxScore: 5 },
          { id: 'javascript', name: 'JavaScript', description: 'Core JS fundamentals', weight: 1, maxScore: 5 },
          { id: 'frameworks', name: 'Frameworks', description: 'React/Vue/Angular knowledge', weight: 1, maxScore: 5 },
          { id: 'performance', name: 'Performance', description: 'Optimization techniques', weight: 0.8, maxScore: 5 },
          { id: 'accessibility', name: 'Accessibility', description: 'A11y best practices', weight: 0.6, maxScore: 5 },
          { id: 'responsive', name: 'Responsive Design', description: 'Mobile-friendly layouts', weight: 0.6, maxScore: 5 },
        ],
      },
    ];

    defaultTemplates.forEach(t => this.templates.set(t.id, t));
  }

  getTemplates(role?: string): ScorecardTemplate[] {
    const templates = Array.from(this.templates.values());
    if (role) {
      return templates.filter(t => t.role.toLowerCase().includes(role.toLowerCase()));
    }
    return templates;
  }

  getTemplate(id: string): ScorecardTemplate | null {
    return this.templates.get(id) || null;
  }

  createTemplate(data: Partial<ScorecardTemplate> & { name: string; criteria: ScoreCriterion[]; createdBy: string }): ScorecardTemplate {
    const template: ScorecardTemplate = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      role: data.role || 'General',
      criteria: data.criteria,
      createdBy: data.createdBy,
      isDefault: false,
      createdAt: new Date(),
    };
    this.templates.set(template.id, template);
    return template;
  }

  createScorecard(
    interviewId: string,
    candidateId: string,
    interviewerId: string,
    templateId: string
  ): Scorecard | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const scorecard: Scorecard = {
      id: uuidv4(),
      interviewId,
      candidateId,
      interviewerId,
      templateId,
      templateName: template.name,
      status: 'draft',
      scores: template.criteria.map(c => ({
        criterionId: c.id,
        score: 0,
        comments: '',
      })),
      totalScore: 0,
      maxPossibleScore: template.criteria.reduce((sum, c) => sum + c.maxScore * c.weight, 0),
      percentage: 0,
      overallRating: 'average',
      strengths: [],
      weaknesses: [],
      recommendation: 'neutral',
      notes: '',
      timestampNotes: [],
      createdAt: new Date(),
    };

    const existing = this.scorecards.get(interviewId) || [];
    existing.push(scorecard);
    this.scorecards.set(interviewId, existing);

    return scorecard;
  }

  getScorecard(id: string): Scorecard | null {
    for (const scorecards of this.scorecards.values()) {
      const found = scorecards.find(s => s.id === id);
      if (found) return found;
    }
    return null;
  }

  updateScorecard(id: string, updates: Partial<Scorecard>): Scorecard | null {
    for (const [interviewId, scorecards] of this.scorecards.entries()) {
      const index = scorecards.findIndex(s => s.id === id);
      if (index !== -1) {
        const updated = { ...scorecards[index], ...updates };
        scorecards[index] = updated;
        this.scorecards.set(interviewId, scorecards);
        return updated;
      }
    }
    return null;
  }

  addScoreEntry(scorecardId: string, entry: ScoreEntry): Scorecard | null {
    const scorecard = this.getScorecard(scorecardId);
    if (!scorecard) return null;

    const entryIndex = scorecard.scores.findIndex(s => s.criterionId === entry.criterionId);
    if (entryIndex !== -1) {
      scorecard.scores[entryIndex] = entry;
    } else {
      scorecard.scores.push(entry);
    }

    this.recalculateScore(scorecard);
    return this.updateScorecard(scorecardId, scorecard);
  }

  addTimestampNote(
    scorecardId: string,
    content: string,
    timestamp: number,
    category: TimestampNote['category']
  ): Scorecard | null {
    const scorecard = this.getScorecard(scorecardId);
    if (!scorecard) return null;

    const note: TimestampNote = {
      id: uuidv4(),
      content,
      timestamp,
      category,
      createdAt: new Date(),
    };

    scorecard.timestampNotes.push(note);
    return this.updateScorecard(scorecardId, scorecard);
  }

  submitScorecard(id: string): Scorecard | null {
    const scorecard = this.getScorecard(id);
    if (!scorecard) return null;

    scorecard.status = 'submitted';
    scorecard.submittedAt = new Date();

    return this.updateScorecard(id, scorecard);
  }

  private recalculateScore(scorecard: Scorecard): void {
    const template = this.templates.get(scorecard.templateId);
    if (!template) return;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    scorecard.scores.forEach(entry => {
      const criterion = template.criteria.find(c => c.id === entry.criterionId);
      if (criterion) {
        totalWeightedScore += (entry.score / criterion.maxScore) * criterion.weight * criterion.maxScore;
        totalWeight += criterion.weight;
      }
    });

    scorecard.totalScore = totalWeightedScore;
    scorecard.percentage = totalWeight > 0 ? (totalWeightedScore / (scorecard.maxPossibleScore || 1)) * 100 : 0;
    scorecard.overallRating = this.getOverallRating(scorecard.percentage);
  }

  private getOverallRating(percentage: number): Scorecard['overallRating'] {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 60) return 'average';
    if (percentage >= 40) return 'below-average';
    return 'poor';
  }

  getInterviewScorecards(interviewId: string): Scorecard[] {
    return this.scorecards.get(interviewId) || [];
  }

  getCandidateScorecards(candidateId: string): Scorecard[] {
    const allScorecards: Scorecard[] = [];
    for (const scorecards of this.scorecards.values()) {
      allScorecards.push(...scorecards.filter(s => s.candidateId === candidateId));
    }
    return allScorecards;
  }

  getAverageScore(candidateId: string): number {
    const scorecards = this.getCandidateScorecards(candidateId);
    if (scorecards.length === 0) return 0;

    const submitted = scorecards.filter(s => s.status === 'submitted');
    if (submitted.length === 0) return 0;

    return submitted.reduce((sum, s) => sum + s.percentage, 0) / submitted.length;
  }

  getInterviewsWithScorecards(): string[] {
    return Array.from(this.scorecards.keys());
  }
}

export const scorecardService = new ScorecardService();
export default scorecardService;