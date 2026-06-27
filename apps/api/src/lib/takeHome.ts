import { ChallengeModel } from '../models/TakeHomeChallenge';
import { ChallengeInviteModel } from '../models/TakeHomeInvite';

export type ChallengeStatus = 'draft' | 'sent' | 'in-progress' | 'submitted' | 'graded' | 'expired';
export type ChallengeType = 'coding' | 'project' | 'quiz' | 'design';

export interface ChallengeQuestion {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  points: number;
  timeLimit?: number;
  starterCode?: Record<string, string>;
  testCases?: TestCase[];
  fileSubmission?: boolean;
  maxFileSize?: number;
  allowedExtensions?: string[];
  multipleChoiceAnswer?: string;
  options?: string[];
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  description: string;
}

export interface Submission {
  id: string;
  challengeId: string;
  candidateId: string;
  answers: ChallengeAnswer[];
  submittedAt: Date;
  timeSpent: number;
  status: 'submitted' | 'graded';
  score?: number;
  feedback?: string;
}

export interface ChallengeAnswer {
  questionId: string;
  code?: string;
  fileUrls?: string[];
  textAnswer?: string;
  multipleChoiceAnswer?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  instructions: string;
  companyId: string;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  duration: number;
  questions: ChallengeQuestion[];
  allowedLanguages?: string[];
  status: ChallengeStatus;
  candidates: string[];
  submissions: Submission[];
  sentAt?: Date;
  startsAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeInvite {
  id: string;
  challengeId: string;
  candidateId: string;
  candidateEmail: string;
  status: 'pending' | 'started' | 'submitted' | 'expired';
  sentAt: Date;
  startedAt?: Date;
  submittedAt?: Date;
  expiresAt: Date;
}

export interface GradingResult {
  questionId: string;
  passed: boolean;
  score: number;
  details: string;
}

export interface ChallengeStats {
  total: number;
  submitted: number;
  graded: number;
  avgScore: number;
}

class TakeHomeService {
  async createChallenge(
    title: string,
    description: string,
    instructions: string,
    companyId: string,
    role: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    duration: number,
    questions: ChallengeQuestion[],
    allowedLanguages?: string[]
  ): Promise<Challenge> {
    const doc = await ChallengeModel.create({
      title,
      description,
      instructions,
      companyId,
      role,
      difficulty,
      duration,
      questions,
      allowedLanguages,
      status: 'draft',
      candidates: [],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    return this.toChallenge(doc.toObject());
  }

  async updateChallenge(
    id: string,
    updates: Partial<Omit<Challenge, 'id' | 'createdAt' | 'updatedAt' | 'submissions'>>
  ): Promise<Challenge | null> {
    const doc = await ChallengeModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    );
    if (!doc) return null;
    return this.toChallenge(doc.toObject());
  }

  async listChallenges(companyId?: string): Promise<Challenge[]> {
    const filter = companyId ? { companyId } : {};
    const docs = await ChallengeModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(d => this.toChallenge(d));
  }

  async deleteChallenge(id: string): Promise<boolean> {
    const result = await ChallengeModel.deleteOne({ id });
    await ChallengeInviteModel.deleteMany({ challengeId: id });
    return result.deletedCount > 0;
  }

  async inviteCandidate(
    challengeId: string,
    candidateId: string,
    candidateEmail: string,
    expiresAt?: Date
  ): Promise<ChallengeInvite | null> {
    const challenge = await ChallengeModel.findOne({ id: challengeId });
    if (!challenge) return null;

    const invite = await ChallengeInviteModel.create({
      challengeId,
      candidateId,
      candidateEmail,
      status: 'pending',
      sentAt: new Date(),
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    if (!challenge.candidates.includes(candidateId)) {
      challenge.candidates.push(candidateId);
      await challenge.save();
    }

    return this.toChallengeInvite(invite.toObject());
  }

  async bulkInvite(
    challengeId: string,
    candidates: { id: string; email: string }[]
  ): Promise<ChallengeInvite[]> {
    const results: ChallengeInvite[] = [];
    for (const c of candidates) {
      const invite = await this.inviteCandidate(challengeId, c.id, c.email);
      if (invite) results.push(invite);
    }
    return results;
  }

  async getInvite(id: string): Promise<ChallengeInvite | null> {
    const doc = await ChallengeInviteModel.findOne({ id }).lean();
    if (!doc) return null;
    return this.toChallengeInvite(doc);
  }

  async startChallenge(inviteId: string, candidateId: string): Promise<Challenge | null> {
    const invite = await ChallengeInviteModel.findOne({ id: inviteId });
    if (!invite || invite.candidateId !== candidateId) return null;
    if (invite.status === 'expired') return null;

    invite.status = 'started';
    invite.startedAt = new Date();
    await invite.save();

    const challenge = await ChallengeModel.findOne({ id: invite.challengeId });
    if (challenge) {
      challenge.status = 'in-progress';
      await challenge.save();
      return this.toChallenge(challenge.toObject());
    }

    return null;
  }

  async submitChallenge(
    challengeId: string,
    candidateId: string,
    answers: ChallengeAnswer[]
  ): Promise<Submission | null> {
    const invite = await ChallengeInviteModel.findOne({
      challengeId,
      candidateId,
      status: 'started',
    });
    if (!invite) return null;

    const submittedAt = new Date();
    const timeSpent = invite.startedAt
      ? (submittedAt.getTime() - invite.startedAt.getTime()) / 1000
      : 0;

    invite.answers = answers as any;
    invite.timeSpent = timeSpent;
    invite.status = 'submitted';
    invite.submittedAt = submittedAt;
    await invite.save();

    await ChallengeModel.updateOne(
      { id: challengeId },
      { $set: { status: 'submitted' } }
    );

    return {
      id: invite.id,
      challengeId,
      candidateId,
      answers,
      submittedAt,
      timeSpent,
      status: 'submitted',
    };
  }

  async getSubmissions(challengeId: string): Promise<Submission[]> {
    const invites = await ChallengeInviteModel.find({
      challengeId,
      status: 'submitted',
    }).lean();

    return invites.map(invite => ({
      id: invite.id,
      challengeId: invite.challengeId,
      candidateId: invite.candidateId,
      answers: (invite.answers || []) as unknown as ChallengeAnswer[],
      submittedAt: invite.submittedAt!,
      timeSpent: invite.timeSpent || 0,
      status: invite.score != null ? 'graded' as const : 'submitted' as const,
      score: invite.score,
      feedback: invite.feedback,
    }));
  }

  async gradeSubmission(
    inviteId: string,
    score: number,
    feedback: string
  ): Promise<Submission | null> {
    const invite = await ChallengeInviteModel.findOne({ id: inviteId });
    if (!invite || invite.status !== 'submitted') return null;

    invite.score = score;
    invite.feedback = feedback;
    await invite.save();

    await ChallengeModel.updateOne(
      { id: invite.challengeId },
      { $set: { status: 'graded' } }
    );

    return {
      id: invite.id,
      challengeId: invite.challengeId,
      candidateId: invite.candidateId,
      answers: (invite.answers || []) as unknown as ChallengeAnswer[],
      submittedAt: invite.submittedAt || new Date(),
      timeSpent: invite.timeSpent || 0,
      status: 'graded',
      score,
      feedback,
    };
  }

  autoGrade(_submissionId: string): { score: number; results: GradingResult[] } | null {
    return null;
  }

  async addFeedback(submissionId: string, feedback: string): Promise<boolean> {
    const invite = await ChallengeInviteModel.findOne({ id: submissionId });
    if (!invite || invite.status !== 'submitted') return false;

    invite.feedback = feedback;
    await invite.save();

    await ChallengeModel.updateOne(
      { id: invite.challengeId },
      { $set: { status: 'graded' } }
    );

    return true;
  }

  async getChallenge(id: string): Promise<Challenge | null> {
    const doc = await ChallengeModel.findOne({ id }).lean();
    if (!doc) return null;
    return this.toChallenge(doc);
  }

  async getChallengeByCandidate(candidateId: string): Promise<Challenge[]> {
    const docs = await ChallengeModel.find({ candidates: candidateId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(d => this.toChallenge(d));
  }

  async getPendingChallenges(candidateId: string): Promise<ChallengeInvite[]> {
    const invites = await ChallengeInviteModel.find({
      candidateId,
      status: 'pending',
    })
      .sort({ expiresAt: 1 })
      .lean();
    return invites.map(i => this.toChallengeInvite(i));
  }

  async getSubmittedChallenges(
    candidateId: string
  ): Promise<{ challenge: Challenge; submission: Submission }[]> {
    const invites = await ChallengeInviteModel.find({
      candidateId,
      status: 'submitted',
    }).lean();

    if (invites.length === 0) return [];

    const challengeIds = [...new Set(invites.map(i => i.challengeId))];
    const challenges = await ChallengeModel.find({ id: { $in: challengeIds } }).lean();
    const challengeMap = new Map(challenges.map(c => [c.id, c]));

    const results: { challenge: Challenge; submission: Submission }[] = [];
    for (const invite of invites) {
      const challenge = challengeMap.get(invite.challengeId);
      if (!challenge) continue;
      results.push({
        challenge: this.toChallenge(challenge),
        submission: {
          id: invite.id,
          challengeId: invite.challengeId,
          candidateId: invite.candidateId,
          answers: (invite.answers || []) as unknown as ChallengeAnswer[],
          submittedAt: invite.submittedAt!,
          timeSpent: invite.timeSpent || 0,
          status: invite.score != null ? 'graded' as const : 'submitted' as const,
          score: invite.score,
          feedback: invite.feedback,
        },
      });
    }
    return results;
  }

  async getCompanyChallenges(companyId: string): Promise<Challenge[]> {
    const docs = await ChallengeModel.find({ companyId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(d => this.toChallenge(d));
  }

  async checkExpiredChallenges(): Promise<number> {
    const now = new Date();
    const result = await ChallengeModel.updateMany(
      {
        expiresAt: { $lte: now },
        status: { $in: ['sent', 'in-progress'] },
      },
      { $set: { status: 'expired' } }
    );

    await ChallengeInviteModel.updateMany(
      {
        expiresAt: { $lte: now },
        status: { $in: ['pending', 'started'] },
      },
      { $set: { status: 'expired' } }
    );

    return result.modifiedCount;
  }

  async getStats(challengeId: string): Promise<ChallengeStats> {
    const [challenge, invites] = await Promise.all([
      ChallengeModel.findOne({ id: challengeId }).lean(),
      ChallengeInviteModel.find({ challengeId }).lean(),
    ]);

    const total = challenge?.candidates.length || 0;
    const submitted = invites.filter(i => i.status === 'submitted').length;
    const graded = invites.filter(i => i.score != null).length;
    const scores = invites.filter(i => i.score != null).map(i => i.score!);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return { total, submitted, graded, avgScore };
  }

  private toChallenge(doc: any): Challenge {
    return {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      instructions: doc.instructions,
      companyId: doc.companyId,
      role: doc.role,
      difficulty: doc.difficulty,
      duration: doc.duration,
      questions: doc.questions || [],
      allowedLanguages: doc.allowedLanguages,
      status: doc.status,
      candidates: doc.candidates || [],
      submissions: [],
      sentAt: doc.sentAt,
      startsAt: doc.startsAt,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toChallengeInvite(doc: any): ChallengeInvite {
    return {
      id: doc.id,
      challengeId: doc.challengeId,
      candidateId: doc.candidateId,
      candidateEmail: doc.candidateEmail,
      status: doc.status,
      sentAt: doc.sentAt,
      startedAt: doc.startedAt,
      submittedAt: doc.submittedAt,
      expiresAt: doc.expiresAt,
    };
  }
}

export const takeHomeService = new TakeHomeService();
export default takeHomeService;
