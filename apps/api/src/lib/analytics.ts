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

const mockInterviewData = {
  totalInterviews: 1250,
  completedInterviews: 1100,
  averageScore: 72.5,
  averageDuration: 45
};

function calculateScoreDistribution(scores: number[]): InterviewAnalytics['scoreDistribution'] {
  return {
    range90_100: scores.filter(s => s >= 90).length,
    range80_89: scores.filter(s => s >= 80 && s < 90).length,
    range70_79: scores.filter(s => s >= 70 && s < 80).length,
    range60_69: scores.filter(s => s >= 60 && s < 70).length,
    below60: scores.filter(s => s < 60).length
  };
}

function calculateCompetencyTrend(scores: number[], previousScores: number[]): 'up' | 'down' | 'stable' {
  const currentAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const previousAvg = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
  
  const diff = currentAvg - previousAvg;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

export function getDashboardAnalytics(tenantId?: string): InterviewAnalytics {
  const mockScores = Array.from({ length: 100 }, () => Math.floor(Math.random() * 40) + 60);
  const previousScores = Array.from({ length: 100 }, () => Math.floor(Math.random() * 40) + 55);

  return {
    overview: {
      totalInterviews: mockInterviewData.totalInterviews,
      completionRate: (mockInterviewData.completedInterviews / mockInterviewData.totalInterviews) * 100,
      averageScore: mockInterviewData.averageScore,
      averageDuration: mockInterviewData.averageDuration
    },
    scoreDistribution: calculateScoreDistribution(mockScores),
    competencyScores: {
      technical: { 
        average: 75 + Math.random() * 10, 
        trend: calculateCompetencyTrend(mockScores.slice(0, 20), previousScores.slice(0, 20))
      },
      communication: { 
        average: 70 + Math.random() * 10, 
        trend: calculateCompetencyTrend(mockScores.slice(20, 40), previousScores.slice(20, 40))
      },
      problemSolving: { 
        average: 72 + Math.random() * 10, 
        trend: calculateCompetencyTrend(mockScores.slice(40, 60), previousScores.slice(40, 60))
      },
      cultureFit: { 
        average: 68 + Math.random() * 10, 
        trend: calculateCompetencyTrend(mockScores.slice(60, 80), previousScores.slice(60, 80))
      }
    },
    proctoring: {
      violations: 45,
      violationTypes: {
        'tab_switch': 15,
        'no_face': 10,
        'multiple_voices': 8,
        'phone_detected': 7,
        'looking_away': 5
      },
      flagRate: 3.6
    }
  };
}

export function getInterviewTrends(days: number = 30): { date: string; count: number; avgScore: number }[] {
  const trends = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 50) + 20,
      avgScore: Math.floor(Math.random() * 20) + 65
    });
  }
  
  return trends;
}

export function getTopPerformers(limit: number = 10): { candidateId: string; name: string; score: number; trend: string }[] {
  const names = ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Edward Norton', 'Fiona Apple', 'George Bush', 'Hannah Montana', 'Ivan Petrov', 'Julia Roberts'];
  
  return names.slice(0, limit).map((name, i) => ({
    candidateId: `cand_${i + 1}`,
    name,
    score: Math.floor(Math.random() * 20) + 80,
    trend: Math.random() > 0.5 ? 'up' : 'stable'
  }));
}

export function predictSuccess(candidateId: string, interviewId: string): PredictiveResult {
  const technicalScore = Math.floor(Math.random() * 30) + 65;
  const communicationScore = Math.floor(Math.random() * 30) + 60;
  const problemSolvingScore = Math.floor(Math.random() * 30) + 60;
  
  const predictedScore = (technicalScore * 0.4 + communicationScore * 0.3 + problemSolvingScore * 0.3);
  const confidence = Math.floor(Math.random() * 20) + 70;
  
  const positiveFactors = [];
  const negativeFactors = [];
  
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

export function analyzePipeline(tenantId?: string): PipelineAnalysis {
  const atRiskCandidates = [
    { id: 'cand_1', name: 'John Doe', riskLevel: 'high' },
    { id: 'cand_2', name: 'Jane Smith', riskLevel: 'medium' }
  ];
  
  const readyForHire = [
    { id: 'cand_3', name: 'Mike Johnson', score: 92 },
    { id: 'cand_4', name: 'Sarah Connor', score: 88 },
    { id: 'cand_5', name: 'Tom Hardy', score: 85 }
  ];
  
  const needsMoreTraining = [
    { id: 'cand_6', name: 'Emily Blunt', weakAreas: ['Technical depth', 'System design'] },
    { id: 'cand_7', name: 'Chris Evans', weakAreas: ['Communication', 'Behavioral questions'] }
  ];
  
  return {
    atRiskCandidates,
    readyForHire,
    needsMoreTraining
  };
}

export function getTrainingRecommendations(candidateId: string): { module: string; priority: string; reason: string }[] {
  return [
    { module: 'System Design Fundamentals', priority: 'high', reason: 'Gap identified in system design skills' },
    { module: 'Behavioral Interview Prep', priority: 'medium', reason: 'STAR method needs refinement' },
    { module: 'Technical Communication', priority: 'low', reason: 'Improve explaining complex concepts' }
  ];
}

export function generateReport(type: 'summary' | 'detailed' | 'export'): { generatedAt: string; type: string; data: unknown } {
  return {
    generatedAt: new Date().toISOString(),
    type,
    data: getDashboardAnalytics()
  };
}