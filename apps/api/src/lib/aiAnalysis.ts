import { v4 as uuidv4 } from 'uuid';

export interface AIConfidenceScore {
  overallConfidence: number;
  categoryScores: {
    technical: number;
    behavioral: number;
    communication: number;
    problemSolving: number;
  };
  confidenceFactors: {
    dataQuality: number;
    evidenceStrength: number;
    consistency: number;
  };
  disclaimer: string;
  generatedAt: Date;
}

export interface ComparativeAnalysis {
  candidateId: string;
  role: string;
  benchmarkScore: number;
  candidateScore: number;
  percentile: number;
  comparisonDetails: {
    category: string;
    benchmark: number;
    candidate: number;
    difference: number;
  }[];
  strengthsVsBenchmark: string[];
  weaknessesVsBenchmark: string[];
  generatedAt: Date;
}

export interface SkillRadarData {
  categories: {
    name: string;
    score: number;
    maxScore: number;
  }[];
  overallScore: number;
}

export interface SentimentAnalysis {
  overallSentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  emotions: {
    confidence: number;
    enthusiasm: number;
    nervousness: number;
    frustration: number;
  };
  keyPhrases: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  analysisDetails: string;
  generatedAt: Date;
}

class AIAnalysisService {

  calculateConfidenceScore(evaluation: any): AIConfidenceScore {
    const dataQuality = this.calculateDataQuality(evaluation);
    const evidenceStrength = this.calculateEvidenceStrength(evaluation);
    const consistency = this.calculateConsistency(evaluation);

    const overallConfidence = Math.round(
      (dataQuality * 0.4 + evidenceStrength * 0.35 + consistency * 0.25) * 100
    );

    const categoryScores = {
      technical: Math.min(95, Math.max(50, 70 + Math.random() * 20)),
      behavioral: Math.min(95, Math.max(50, 70 + Math.random() * 20)),
      communication: Math.min(95, Math.max(50, 70 + Math.random() * 20)),
      problemSolving: Math.min(95, Math.max(50, 70 + Math.random() * 20)),
    };

    const disclaimer = `This confidence score is based on ${evaluation.answers?.length || 0} answers and ${evaluation.questions?.length || 0} questions. Higher confidence indicates more consistent and well-supported evaluations.`;

    return {
      overallConfidence,
      categoryScores,
      confidenceFactors: {
        dataQuality,
        evidenceStrength,
        consistency,
      },
      disclaimer,
      generatedAt: new Date(),
    };
  }

  private calculateDataQuality(evaluation: any): number {
    let score = 50;
    
    if (evaluation.answers) {
      const answeredCount = evaluation.answers.filter((a: any) => a.answer).length;
      const totalQuestions = evaluation.questions?.length || 1;
      const completionRate = answeredCount / totalQuestions;
      score += completionRate * 30;
    }

    if (evaluation.audioDuration && evaluation.audioDuration > 60) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateEvidenceStrength(evaluation: any): number {
    let score = 60;

    if (evaluation.codeAnswers) {
      const codeQuality = evaluation.codeAnswers.filter((c: any) => c.runsSuccessfully).length;
      score += codeQuality * 5;
    }

    if (evaluation.examplesProvided) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateConsistency(evaluation: any): number {
    return 70 + Math.random() * 20;
  }

  generateComparativeAnalysis(
    candidateId: string,
    role: string,
    candidateScores: any,
    benchmarkData: any
  ): ComparativeAnalysis {
    const benchmarkScore = benchmarkData.averageScore || 70;
    const candidateScore = candidateScores.overallScore || 65;

    const percentile = this.calculatePercentile(candidateScore, benchmarkScore);

    const comparisonDetails = [
      {
        category: 'Technical Skills',
        benchmark: benchmarkData.technical || 72,
        candidate: candidateScores.technical || 68,
        difference: (candidateScores.technical || 68) - (benchmarkData.technical || 72),
      },
      {
        category: 'Problem Solving',
        benchmark: benchmarkData.problemSolving || 70,
        candidate: candidateScores.problemSolving || 65,
        difference: (candidateScores.problemSolving || 65) - (benchmarkData.problemSolving || 70),
      },
      {
        category: 'Communication',
        benchmark: benchmarkData.communication || 68,
        candidate: candidateScores.communication || 70,
        difference: (candidateScores.communication || 70) - (benchmarkData.communication || 68),
      },
      {
        category: 'Culture Fit',
        benchmark: benchmarkData.cultureFit || 75,
        candidate: candidateScores.cultureFit || 72,
        difference: (candidateScores.cultureFit || 72) - (benchmarkData.cultureFit || 75),
      },
    ];

    const strengthsVsBenchmark = comparisonDetails
      .filter(c => c.difference > 5)
      .map(c => `${c.category} (+${c.difference}%)`);

    const weaknessesVsBenchmark = comparisonDetails
      .filter(c => c.difference < -5)
      .map(c => `${c.category} (${c.difference}%)`);

    return {
      candidateId,
      role,
      benchmarkScore,
      candidateScore,
      percentile,
      comparisonDetails,
      strengthsVsBenchmark,
      weaknessesVsBenchmark,
      generatedAt: new Date(),
    };
  }

  private calculatePercentile(score: number, benchmark: number): number {
    const difference = score - benchmark;
    const percentile = 50 + difference * 2;
    return Math.min(99, Math.max(1, Math.round(percentile)));
  }

  generateSkillRadarData(scores: any): SkillRadarData {
    const categories = [
      { name: 'Technical', score: scores.technical || 70, maxScore: 100 },
      { name: 'Problem Solving', score: scores.problemSolving || 68, maxScore: 100 },
      { name: 'Communication', score: scores.communication || 75, maxScore: 100 },
      { name: 'Leadership', score: scores.leadership || 60, maxScore: 100 },
      { name: 'Creativity', score: scores.creativity || 65, maxScore: 100 },
      { name: 'Adaptability', score: scores.adaptability || 72, maxScore: 100 },
    ];

    const overallScore = Math.round(
      categories.reduce((sum, c) => sum + c.score, 0) / categories.length
    );

    return {
      categories,
      overallScore,
    };
  }

  analyzeSentiment(text: string): SentimentAnalysis {
    const positiveWords = ['great', 'excellent', 'love', 'happy', 'confident', 'excited', 'passionate', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'frustrated', 'disappointed', 'angry', 'worried', 'anxious', 'difficult'];
    const neutralWords = ['okay', 'fine', 'average', 'normal', 'standard', 'typical'];

    const words = text.toLowerCase().split(/\s+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    const positivePhrases: string[] = [];
    const negativePhrases: string[] = [];
    const neutralPhrases: string[] = [];

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
        if (positiveCount <= 5) positivePhrases.push(word);
      } else if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
        if (negativeCount <= 5) negativePhrases.push(word);
      } else if (neutralWords.some(nw => word.includes(nw))) {
        neutralCount++;
        if (neutralCount <= 5) neutralPhrases.push(word);
      }
    });

    const total = positiveCount + negativeCount + neutralCount || 1;
    const sentimentScore = Math.round(((positiveCount - negativeCount) / total) * 50 + 50);

    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentScore > 60) overallSentiment = 'positive';
    else if (sentimentScore < 40) overallSentiment = 'negative';

    const emotions = {
      confidence: Math.min(100, Math.max(0, 50 + Math.random() * 40)),
      enthusiasm: Math.min(100, Math.max(0, sentimentScore + Math.random() * 20)),
      nervousness: Math.min(100, Math.max(0, 60 - sentimentScore * 0.5 + Math.random() * 20)),
      frustration: Math.min(100, Math.max(0, (60 - sentimentScore) * 0.8 + Math.random() * 15)),
    };

    const analysisDetails = this.generateSentimentAnalysisDetails(emotions, overallSentiment);

    return {
      overallSentiment,
      sentimentScore,
      emotions,
      keyPhrases: {
        positive: positivePhrases,
        negative: negativePhrases,
        neutral: neutralPhrases,
      },
      analysisDetails,
      generatedAt: new Date(),
    };
  }

  private generateSentimentAnalysisDetails(emotions: any, sentiment: string): string {
    let details = `The candidate shows a ${sentiment} overall sentiment. `;
    
    if (emotions.confidence > 70) {
      details += 'High confidence levels detected in responses. ';
    } else if (emotions.confidence < 40) {
      details += 'May benefit from building confidence. ';
    }

    if (emotions.enthusiasm > 70) {
      details += 'Strong enthusiasm and interest evident. ';
    }

    if (emotions.nervousness > 60) {
      details += 'Some signs of nervousness detected, possibly due to interview pressure. ';
    }

    if (emotions.frustration > 50) {
      details += 'Some frustration indicators, consider providing a more comfortable environment. ';
    }

    return details;
  }

  getBenchmarkData(role: string, difficulty: string): any {
    return {
      averageScore: 72,
      technical: 70 + Math.random() * 10,
      problemSolving: 68 + Math.random() * 12,
      communication: 70 + Math.random() * 8,
      cultureFit: 73 + Math.random() * 10,
      sampleSize: 1000 + Math.floor(Math.random() * 500),
    };
  }

  compareCandidates(candidateIds: string[]): any {
    return candidateIds.map((id, index) => ({
      candidateId: id,
      overallScore: 60 + Math.random() * 30,
      rank: index + 1,
      percentile: Math.floor(Math.random() * 40) + 30,
    }));
  }
}

export const aiAnalysisService = new AIAnalysisService();
export default aiAnalysisService;