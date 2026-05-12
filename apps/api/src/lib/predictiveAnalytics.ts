import { logger } from "./logger";

export interface CandidateProfile {
  experience: number;
  education: string;
  skills: string[];
  previousRoles: string[];
  interviewScore: number;
  communicationScore: number;
  technicalScore: number;
  culturalFit: number;
}

export interface PredictionResult {
  probability: number;
  confidence: "high" | "medium" | "low";
  factors: {
    positive: string[];
    negative: string[];
  };
  recommendation: "strong_yes" | "yes" | "neutral" | "no" | "strong_no";
}

export interface HiringMetrics {
  timeToHire: number;
  costPerHire: number;
  interviewToOffer: number;
  offerAcceptance: number;
  qualityOfHire: number;
}

export function predictAttritionRisk(candidateData: {
  previousJobChanges: number;
  tenure: number;
  reasonsForLeaving?: string[];
  salaryExpectation: number;
  marketCompensation: number;
}): {
  riskLevel: "low" | "medium" | "high";
  probability: number;
  reasons: string[];
} {
  let riskScore = 0;
  const reasons: string[] = [];

  if (candidateData.previousJobChanges > 3) {
    riskScore += 30;
    reasons.push("High job change frequency");
  }

  if (candidateData.tenure < 12) {
    riskScore += 20;
    reasons.push("Short tenure in current role");
  }

  if (candidateData.salaryExpectation > candidateData.marketCompensation * 1.2) {
    riskScore += 25;
    reasons.push("Salary expectations above market");
  }

  const leavings = candidateData.reasonsForLeaving || [];
  if (leavings.some(r => r.toLowerCase().includes("toxic") || r.toLowerCase().includes("manager"))) {
    riskScore += 35;
    reasons.push("Previous negative experiences");
  }

  const riskLevel = riskScore > 50 ? "high" : riskScore > 25 ? "medium" : "low";

  return {
    riskLevel,
    probability: Math.min(100, riskScore),
    reasons,
  };
}

export function predictJobPerformance(candidate: CandidateProfile): PredictionResult {
  const weights = {
    technical: 0.35,
    communication: 0.20,
    culturalFit: 0.25,
    experience: 0.20,
  };

  let score = 0;
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  score += candidate.technicalScore * weights.technical;
  if (candidate.technicalScore > 80) positiveFactors.push("Strong technical skills");
  if (candidate.technicalScore < 50) negativeFactors.push("Technical gaps identified");

  score += candidate.communicationScore * weights.communication;
  if (candidate.communicationScore > 75) positiveFactors.push("Excellent communication");
  if (candidate.communicationScore < 50) negativeFactors.push("Communication needs improvement");

  score += candidate.culturalFit * weights.culturalFit;
  if (candidate.culturalFit > 80) positiveFactors.push("Strong cultural fit");

  score += Math.min(100, candidate.experience * 10) * weights.experience;
  if (candidate.experience > 5) positiveFactors.push("Extensive experience");

  const probability = Math.round(score);
  const confidence = probability > 75 || probability < 35 ? "high" : "medium";

  let recommendation: PredictionResult["recommendation"];
  if (probability >= 85) recommendation = "strong_yes";
  else if (probability >= 70) recommendation = "yes";
  else if (probability >= 50) recommendation = "neutral";
  else if (probability >= 35) recommendation = "no";
  else recommendation = "strong_no";

  return {
    probability,
    confidence,
    factors: { positive: positiveFactors, negative: negativeFactors },
    recommendation,
  };
}

export function optimizeInterviewDuration(
  jobLevel: "entry" | "mid" | "senior" | "lead",
  candidateExperience: number,
  technicalComplexity: number
): {
  optimalDuration: number;
  breakdown: {
    coding: number;
    behavioral: number;
    systemDesign: number;
    cultureFit: number;
  };
  reasoning: string;
} {
  const baseDuration = jobLevel === "entry" ? 45 : jobLevel === "mid" ? 60 : jobLevel === "senior" ? 75 : 90;

  const expBonus = Math.min(candidateExperience * 2, 15);
  const complexityBonus = technicalComplexity > 7 ? 15 : 0;

  const optimalDuration = baseDuration + expBonus + complexityBonus;

  const ratio = {
    coding: jobLevel === "lead" ? 0.35 : 0.30,
    behavioral: 0.20,
    systemDesign: jobLevel === "entry" ? 0.15 : 0.25,
    cultureFit: 0.25,
  };

  return {
    optimalDuration,
    breakdown: {
      coding: Math.round(optimalDuration * ratio.coding),
      behavioral: Math.round(optimalDuration * ratio.behavioral),
      systemDesign: Math.round(optimalDuration * ratio.systemDesign),
      cultureFit: Math.round(optimalDuration * ratio.cultureFit),
    },
    reasoning: `Optimized for ${jobLevel} level with ${candidateExperience} years experience`,
  };
}

export function matchBestInterviewer(
  candidate: {
    role: string;
    requiredSkills: string[];
    interviewType: "technical" | "behavioral" | "mixed";
  },
  interviewers: Array<{
    id: string;
    name: string;
    expertise: string[];
    avgRating: number;
    availability: number;
  }>
): {
  interviewerId: string;
  name: string;
  matchScore: number;
  reasoning: string;
} | null {
  if (interviewers.length === 0) return null;

  const scored = interviewers.map(interviewer => {
    let score = 0;

    const skillMatch = interviewer.expertise.filter(s => 
      candidate.requiredSkills.includes(s)
    ).length;
    score += skillMatch * 20;

    score += interviewer.avgRating * 2;

    score += interviewer.availability * 5;

    return { interviewer, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  return {
    interviewerId: best.interviewer.id,
    name: best.interviewer.name,
    matchScore: Math.min(100, best.score),
    reasoning: `Best skill match and availability`,
  };
}