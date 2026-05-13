import { InterviewModel } from "../models/Interview";
import { logger } from "./logger";

interface InterviewAnalytics {
  overview: {
    totalInterviews: number;
    completionRate: number;
    averageScore: number;
    averageDuration: number;
  };
  scoreDistribution: {
    range90_100: number;
    range80_89: number;
    range70_79: number;
    range60_69: number;
    below60: number;
  };
  competencyScores: {
    technical: { average: number; trend: 'up' | 'down' | 'stable' };
    communication: { average: number; trend: 'up' | 'down' | 'stable' };
    problemSolving: { average: number; trend: 'up' | 'down' | 'stable' };
    cultureFit: { average: number; trend: 'up' | 'down' | 'stable' };
  };
  proctoring: {
    violations: number;
    violationTypes: Record<string, number>;
    flagRate: number;
  };
}

interface PredictiveResult {
  candidateId: string;
  interviewId: string;
  predictedScore: number;
  confidence: number;
  factors: {
    positive: string[];
    negative: string[];
  };
}

interface PipelineAnalysis {
  atRiskCandidates: { id: string; name: string; riskLevel: string }[];
  readyForHire: { id: string; name: string; score: number }[];
  needsMoreTraining: { id: string; name: string; weakAreas: string[] }[];
}

function calculateScoreDistribution(scores: number[]): InterviewAnalytics['scoreDistribution'] {
  return {
    range90_100: scores.filter(s => s >= 90).length,
    range80_89: scores.filter(s => s >= 80 && s < 90).length,
    range70_79: scores.filter(s => s >= 70 && s < 80).length,
    range60_69: scores.filter(s => s >= 60 && s < 70).length,
    below60: scores.filter(s => s < 60).length
  };
}

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

export async function getDashboardAnalytics(_tenantId?: string): Promise<InterviewAnalytics> {
  try {
    const total = await InterviewModel.countDocuments();
    const completed = await InterviewModel.countDocuments({ status: "completed" });
    const allScores = await InterviewModel.find({ score: { $gt: 0 } }).select("score").lean();
    const scores = allScores.map(i => i.score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    /* Average duration approximated from message count */
    const withMessages = await InterviewModel.find({ "messages.0": { $exists: true } }).select("messages").lean();
    const avgDuration = withMessages.length > 0
      ? Math.round(withMessages.reduce((sum, i) => sum + (i.messages?.length || 0), 0) / withMessages.length * 3)
      : 0;

    /* Competency scores from metrics */
    const withMetrics = await InterviewModel.find({ metrics: { $exists: true, $not: { $size: 0 } } }).select("metrics createdAt").sort({ createdAt: -1 }).limit(100).lean();
    const metrics = withMetrics.flatMap(i => i.metrics || []);
    const subjectScores = (subj: string) => metrics.filter((m: any) => m.subject === subj).map((m: any) => m.A || 0).filter((s: number) => s > 0);

    const technical = subjectScores("technical");
    const communication = subjectScores("communication");
    const problemSolving = subjectScores("problemSolving");
    const cultureFit = subjectScores("cultureFit");

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const prev = (arr: number[]) => arr.slice(Math.floor(arr.length / 2));
    const cur = (arr: number[]) => arr.slice(0, Math.floor(arr.length / 2));

    return {
      overview: {
        totalInterviews: total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        averageScore: avgScore,
        averageDuration: avgDuration,
      },
      scoreDistribution: calculateScoreDistribution(scores),
      competencyScores: {
        technical: { average: Math.round(avg(technical)) || 0, trend: calculateTrend(avg(cur(technical)), avg(prev(technical))) },
        communication: { average: Math.round(avg(communication)) || 0, trend: calculateTrend(avg(cur(communication)), avg(prev(communication))) },
        problemSolving: { average: Math.round(avg(problemSolving)) || 0, trend: calculateTrend(avg(cur(problemSolving)), avg(prev(problemSolving))) },
        cultureFit: { average: Math.round(avg(cultureFit)) || 0, trend: calculateTrend(avg(cur(cultureFit)), avg(prev(cultureFit))) },
      },
      proctoring: {
        violations: 0,
        violationTypes: {},
        flagRate: 0,
      },
    };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to get dashboard analytics");
    return {
      overview: { totalInterviews: 0, completionRate: 0, averageScore: 0, averageDuration: 0 },
      scoreDistribution: { range90_100: 0, range80_89: 0, range70_79: 0, range60_69: 0, below60: 0 },
      competencyScores: {
        technical: { average: 0, trend: 'stable' },
        communication: { average: 0, trend: 'stable' },
        problemSolving: { average: 0, trend: 'stable' },
        cultureFit: { average: 0, trend: 'stable' },
      },
      proctoring: { violations: 0, violationTypes: {}, flagRate: 0 },
    };
  }
}

export async function getInterviewTrends(days: number = 30): Promise<{ date: string; count: number; avgScore: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const interviews = await InterviewModel.find({ createdAt: { $gte: since } }).select("createdAt score").lean();

  const map = new Map<string, { count: number; scores: number[] }>();
  for (const iv of interviews) {
    const date = (iv.createdAt as Date).toISOString().split("T")[0];
    const entry = map.get(date) || { count: 0, scores: [] };
    entry.count++;
    if ((iv.score as number) > 0) entry.scores.push(iv.score as number);
    map.set(date, entry);
  }

  const result: { date: string; count: number; avgScore: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const entry = map.get(key);
    result.push({
      date: key,
      count: entry?.count || 0,
      avgScore: entry && entry.scores.length > 0 ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length) : 0,
    });
  }
  return result;
}

export async function getTopPerformers(limit: number = 10): Promise<{ candidateId: string; name: string; score: number; trend: string }[]> {
  const docs = await InterviewModel.find({ status: "completed", score: { $gt: 0 } })
    .sort({ score: -1 })
    .limit(limit)
    .select("userId score createdAt")
    .lean();

  return docs.map((d, i) => ({
    candidateId: d.userId,
    name: `Candidate ${i + 1}`,
    score: d.score as number,
    trend: 'stable',
  }));
}

export async function predictSuccess(candidateId: string, interviewId: string): Promise<PredictiveResult> {
  const interview = await InterviewModel.findById(interviewId).lean();
  const metrics = (interview?.metrics || []) as any[];
  const technicalScore = Math.round(metrics.find((m: any) => m.subject === 'technical')?.A || 0);
  const communicationScore = Math.round(metrics.find((m: any) => m.subject === 'communication')?.A || 0);
  const problemSolvingScore = Math.round(metrics.find((m: any) => m.subject === 'problemSolving')?.A || 0);

  const predictedScore = (technicalScore * 0.4 + communicationScore * 0.3 + problemSolvingScore * 0.3);
  const confidence = metrics.length > 0 ? Math.min(100, Math.round(70 + metrics.length * 5)) : 50;

  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  if (technicalScore > 80) positiveFactors.push('Strong technical skills');
  if (communicationScore > 75) positiveFactors.push('Excellent communication');
  if (problemSolvingScore > 75) positiveFactors.push('Strong problem-solving abilities');

  if (technicalScore < 70) negativeFactors.push('Technical skills need improvement');
  if (communicationScore < 65) negativeFactors.push('Communication could be better');
  if (problemSolvingScore < 65) negativeFactors.push('Problem-solving needs work');

  return {
    candidateId,
    interviewId,
    predictedScore: Math.round(predictedScore),
    confidence,
    factors: {
      positive: positiveFactors.length > 0 ? positiveFactors : ['Consistent performance'],
      negative: negativeFactors.length > 0 ? negativeFactors : []
    }
  };
}

export async function analyzePipeline(_tenantId?: string): Promise<PipelineAnalysis> {
  const completed = await InterviewModel.find({ status: "completed", score: { $gt: 0 } }).select("userId score metrics feedback").lean();

  const atRiskCandidates: PipelineAnalysis['atRiskCandidates'] = [];
  const readyForHire: PipelineAnalysis['readyForHire'] = [];
  const needsMoreTraining: PipelineAnalysis['needsMoreTraining'] = [];

  for (const iv of completed) {
    const score = iv.score as number;
    const id = iv.userId as string;
    if (score >= 85) {
      readyForHire.push({ id, name: id, score });
    } else if (score < 60) {
      atRiskCandidates.push({ id, name: id, riskLevel: 'high' });
    } else {
      const weakAreas: string[] = [];
      const metrics = (iv.metrics || []) as any[];
      if ((metrics.find((m: any) => m.subject === 'technical')?.A || 0) < 60) weakAreas.push('Technical depth');
      if ((metrics.find((m: any) => m.subject === 'communication')?.A || 0) < 60) weakAreas.push('Communication');
      if ((metrics.find((m: any) => m.subject === 'problemSolving')?.A || 0) < 60) weakAreas.push('Problem solving');
      if (weakAreas.length > 0) {
        needsMoreTraining.push({ id, name: id, weakAreas });
      }
    }
  }

  return { atRiskCandidates, readyForHire, needsMoreTraining };
}

export async function getTrainingRecommendations(candidateId: string): Promise<{ module: string; priority: string; reason: string }[]> {
  const interview = await InterviewModel.findOne({ userId: candidateId }).sort({ createdAt: -1 }).select("metrics feedback").lean();
  const metrics = (interview?.metrics || []) as any[];
  const recs: { module: string; priority: string; reason: string }[] = [];

  const tech = metrics.find((m: any) => m.subject === 'technical')?.A || 0;
  const comm = metrics.find((m: any) => m.subject === 'communication')?.A || 0;
  const ps = metrics.find((m: any) => m.subject === 'problemSolving')?.A || 0;

  if (tech < 60) recs.push({ module: 'System Design Fundamentals', priority: 'high', reason: 'Gap identified in system design skills' });
  if (comm < 60) recs.push({ module: 'Behavioral Interview Prep', priority: 'medium', reason: 'STAR method needs refinement' });
  if (ps < 60) recs.push({ module: 'Technical Communication', priority: 'low', reason: 'Improve explaining complex concepts' });

  if (recs.length === 0) {
    recs.push({ module: 'Advanced Coding Patterns', priority: 'low', reason: 'Maintain and sharpen technical skills' });
  }
  return recs;
}

export async function generateReport(type: 'summary' | 'detailed' | 'export'): Promise<{ generatedAt: string; type: string; data: unknown }> {
  return {
    generatedAt: new Date().toISOString(),
    type,
    data: await getDashboardAnalytics()
  };
}