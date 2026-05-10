import { v4 as uuidv4 } from 'uuid';

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

class TakeHomeService {
  private challenges: Map<string, Challenge> = new Map();
  private invites: Map<string, ChallengeInvite> = new Map();

  createChallenge(
    title: string,
    description: string,
    instructions: string,
    companyId: string,
    role: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'expert',
    duration: number,
    questions: ChallengeQuestion[],
    allowedLanguages?: string[]
  ): Challenge {
    const challenge: Challenge = {
      id: uuidv4(),
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
      submissions: [],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  inviteCandidate(
    challengeId: string,
    candidateId: string,
    candidateEmail: string,
    expiresAt?: Date
  ): ChallengeInvite | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    const invite: ChallengeInvite = {
      id: uuidv4(),
      challengeId,
      candidateId,
      candidateEmail,
      status: 'pending',
      sentAt: new Date(),
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    this.invites.set(invite.id, invite);
    challenge.candidates.push(candidateId);
    this.challenges.set(challengeId, challenge);

    return invite;
  }

  bulkInvite(
    challengeId: string,
    candidates: { id: string; email: string }[]
  ): ChallengeInvite[] {
    const invites: ChallengeInvite[] = [];
    candidates.forEach(c => {
      const invite = this.inviteCandidate(challengeId, c.id, c.email);
      if (invite) invites.push(invite);
    });
    return invites;
  }

  startChallenge(inviteId: string, candidateId: string): Challenge | null {
    const invite = this.invites.get(inviteId);
    if (!invite || invite.candidateId !== candidateId) return null;

    if (invite.status === 'expired') return null;

    invite.status = 'started';
    invite.startedAt = new Date();
    this.invites.set(inviteId, invite);

    const challenge = this.challenges.get(invite.challengeId);
    if (challenge) {
      challenge.status = 'in-progress';
      this.challenges.set(challenge.id, challenge);
    }

    return challenge || null;
  }

  submitChallenge(
    challengeId: string,
    candidateId: string,
    answers: ChallengeAnswer[]
  ): Submission | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    const invite = Array.from(this.invites.values())
      .find(i => i.challengeId === challengeId && i.candidateId === candidateId);
    
    if (!invite || invite.status !== 'started') return null;

    const submission: Submission = {
      id: uuidv4(),
      challengeId,
      candidateId,
      answers,
      submittedAt: new Date(),
      timeSpent: invite.startedAt
        ? (new Date().getTime() - invite.startedAt.getTime()) / 1000
        : 0,
      status: 'submitted',
    };

    challenge.submissions.push(submission);
    challenge.status = 'submitted';
    this.challenges.set(challengeId, challenge);

    invite.status = 'submitted';
    invite.submittedAt = new Date();
    this.invites.set(invite.id, invite);

    return submission;
  }

  autoGrade(submissionId: string): { score: number; results: GradingResult[] } | null {
    for (const challenge of this.challenges.values()) {
      const submission = challenge.submissions.find(s => s.id === submissionId);
      if (submission) {
        const results: GradingResult[] = [];
        let totalScore = 0;

        submission.answers.forEach(answer => {
          const question = challenge.questions.find(q => q.id === answer.questionId);
          if (!question) return;

          const questionResult: GradingResult = {
            questionId: question.id,
            passed: false,
            score: 0,
            details: '',
          };

          if (question.type === 'coding' && answer.code && question.testCases) {
            const passedTests = question.testCases.filter(tc => {
              if (tc.isHidden) return true;
              return true;
            });

            const score = Math.round((passedTests.length / question.testCases.length) * question.points);
            questionResult.passed = passedTests.length === question.testCases.length;
            questionResult.score = score;
            questionResult.details = `${passedTests.length}/${question.testCases.length} tests passed`;
            totalScore += score;
          } else if (question.type === 'quiz') {
            const isCorrect = question.multipleChoiceAnswer === answer.multipleChoiceAnswer;
            questionResult.passed = isCorrect;
            questionResult.score = isCorrect ? question.points : 0;
          }

          results.push(questionResult);
        });

        submission.score = totalScore;
        this.challenges.set(challenge.id, challenge);

        return { score: totalScore, results };
      }
    }
    return null;
  }

  addFeedback(submissionId: string, feedback: string): boolean {
    for (const challenge of this.challenges.values()) {
      const submission = challenge.submissions.find(s => s.id === submissionId);
      if (submission) {
        submission.feedback = feedback;
        challenge.status = 'graded';
        this.challenges.set(challenge.id, challenge);
        return true;
      }
    }
    return false;
  }

  getChallenge(id: string): Challenge | null {
    return this.challenges.get(id) || null;
  }

  getChallengeByCandidate(candidateId: string): Challenge[] {
    return Array.from(this.challenges.values())
      .filter(c => c.candidates.includes(candidateId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPendingChallenges(candidateId: string): ChallengeInvite[] {
    return Array.from(this.invites.values())
      .filter(i => i.candidateId === candidateId && i.status === 'pending')
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }

  getSubmittedChallenges(candidateId: string): { challenge: Challenge; submission: Submission }[] {
    const results: { challenge: Challenge; submission: Submission }[] = [];

    for (const challenge of this.challenges.values()) {
      const submission = challenge.submissions.find(s => s.candidateId === candidateId);
      if (submission) {
        results.push({ challenge, submission });
      }
    }

    return results;
  }

  getCompanyChallenges(companyId: string): Challenge[] {
    return Array.from(this.challenges.values())
      .filter(c => c.companyId === companyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  checkExpiredChallenges(): number {
    let expired = 0;
    const now = new Date();

    for (const [id, challenge] of this.challenges.entries()) {
      if (now >= challenge.expiresAt && (challenge.status === 'sent' || challenge.status === 'in-progress')) {
        challenge.status = 'expired';
        challenge.updatedAt = new Date();
        this.challenges.set(id, challenge);
        expired++;
      }
    }

    return expired;
  }

  getStats(challengeId: string): ChallengeStats {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return { total: 0, submitted: 0, graded: 0, avgScore: 0 };

    const submitted = challenge.submissions.filter(s => s.status !== 'submitted').length;
    const graded = challenge.submissions.filter(s => s.feedback).length;
    const scores = challenge.submissions.filter(s => s.score !== undefined).map(s => s.score!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return {
      total: challenge.candidates.length,
      submitted,
      graded,
      avgScore: Math.round(avgScore),
    };
  }
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

export const takeHomeService = new TakeHomeService();
export default takeHomeService;