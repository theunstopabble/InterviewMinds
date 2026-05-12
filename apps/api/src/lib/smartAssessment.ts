import Groq from "groq-sdk";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

interface JobDescription {
  title: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears: number;
  responsibilities: string[];
  competencies: string[];
}

interface CompetencyGap {
  competency: string;
  required: number;
  demonstrated: number;
  gap: number;
  severity: "critical" | "major" | "minor";
}

interface MatchResult {
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  competencyMatch: number;
  missingSkills: string[];
  matchedSkills: string[];
}

interface DifficultyLevel {
  current: "entry" | "mid" | "senior" | "lead";
  recommended: "entry" | "mid" | "senior" | "lead";
  reasoning: string;
}

interface PredictionResult {
  successProbability: number;
  confidence: "high" | "medium" | "low";
  factors: {
    positive: string[];
    negative: string[];
  };
  recommendation: "strong_hire" | "hire" | "neutral" | "no_hire" | "strong_no_hire";
}

function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  return new Groq({ apiKey: key });
}

export async function generateQuestionsFromJobDescription(
  jobDescription: string,
  count: number = 10
): Promise<{
  questions: Array<{
    text: string;
    type: "behavioral" | "technical" | "situational";
    difficulty: "entry" | "mid" | "senior" | "lead";
    competency: string;
    evaluationCriteria: string[];
  }>;
}> {
  const groq = getGroqClient();

  const prompt = `Generate ${count} interview questions based on this job description:

${jobDescription}

Return JSON with this structure:
{
  "questions": [
    {
      "text": "question text",
      "type": "behavioral|technical|situational",
      "difficulty": "entry|mid|senior|lead",
      "competency": "competency name",
      "evaluationCriteria": ["criteria1", "criteria2"]
    }
  ]
}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  });

  try {
    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to parse generated questions");
  }

  return { questions: [] };
}

export function calculateCompetencyGap(
  requiredCompetencies: string[],
  demonstratedCompetencies: Record<string, number>
): CompetencyGap[] {
  return requiredCompetencies.map(competency => {
    const demonstrated = demonstratedCompetencies[competency] || 0;
    const required = 80;
    const gap = required - demonstrated;
    
    let severity: "critical" | "major" | "minor" = "minor";
    if (gap > 40) severity = "critical";
    else if (gap > 20) severity = "major";

    return {
      competency,
      required,
      demonstrated,
      gap,
      severity,
    };
  }).sort((a, b) => b.gap - a.gap);
}

export async function calculateResumeJobMatch(
  resumeEntities: {
    skills: string[];
    experience: { title: string; company: string; duration: number }[];
    education: { degree: string; school: string; year: number }[];
  },
  jobRequirements: {
    requiredSkills: string[];
    preferredSkills: string[];
    experienceYears: number;
    requiredEducation?: string[];
  }
): Promise<MatchResult> {
  const resumeSkills = resumeEntities.skills.map(s => s.toLowerCase());
  const requiredSkills = jobRequirements.requiredSkills.map(s => s.toLowerCase());
  const preferredSkills = jobRequirements.preferredSkills.map(s => s.toLowerCase());

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  requiredSkills.forEach(skill => {
    if (resumeSkills.includes(skill)) {
      matchedSkills.push(skill);
    } else {
      const similar = resumeSkills.find(r => 
        r.includes(skill) || skill.includes(r)
      );
      if (similar) {
        matchedSkills.push(similar);
      } else {
        missingSkills.push(skill);
      }
    }
  });

  const skillMatch = Math.round((matchedSkills.length / requiredSkills.length) * 100);

  const totalExperience = resumeEntities.experience.reduce((sum, exp) => sum + exp.duration, 0);
  const experienceMatch = Math.min(100, Math.round((totalExperience / jobRequirements.experienceYears) * 100));

  const preferredMatched = preferredSkills.filter(s => 
    resumeSkills.includes(s.toLowerCase())
  ).length;
  const competencyMatch = Math.round(
    ((matchedSkills.length + preferredMatched) / 
    (requiredSkills.length + preferredSkills.length)) * 100
  );

  const overallScore = Math.round(
    (skillMatch * 0.5) + (experienceMatch * 0.3) + (competencyMatch * 0.2)
  );

  return {
    overallScore,
    skillMatch,
    experienceMatch,
    competencyMatch,
    missingSkills,
    matchedSkills,
  };
}

export function adjustDifficulty(
  currentDifficulty: "entry" | "mid" | "senior" | "lead",
  performanceMetrics: {
    correctAnswers: number;
    totalQuestions: number;
    avgTimePerQuestion: number;
    hintRequests: number;
    confidenceScore: number;
  }
): DifficultyLevel {
  const { correctAnswers, totalQuestions, avgTimePerQuestion, hintRequests, confidenceScore } = performanceMetrics;
  
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const hintRatio = totalQuestions > 0 ? (hintRequests / totalQuestions) * 100 : 0;

  let recommendedDifficulty = currentDifficulty;
  let reasoning = "";

  if (accuracy > 85 && hintRatio < 10 && confidenceScore > 80) {
    if (currentDifficulty === "entry") {
      recommendedDifficulty = "mid";
      reasoning = "Excellent performance - upgrading difficulty";
    } else if (currentDifficulty === "mid") {
      recommendedDifficulty = "senior";
      reasoning = "Strong performance - challenging candidate more";
    }
  } else if (accuracy < 50 || hintRatio > 40 || confidenceScore < 40) {
    if (currentDifficulty === "senior") {
      recommendedDifficulty = "mid";
      reasoning = "Struggling - reducing difficulty";
    } else if (currentDifficulty === "mid") {
      recommendedDifficulty = "entry";
      reasoning = "Needs easier questions";
    }
  } else {
    reasoning = "Current difficulty appropriate";
  }

  return {
    current: currentDifficulty,
    recommended: recommendedDifficulty,
    reasoning,
  };
}

export async function predictCandidateSuccess(
  interviewData: {
    score: number;
    metrics: Array<{ subject: string; A: number }>;
    communicationScore: number;
    technicalDepth: number;
    problemSolving: number;
    resumeMatchScore: number;
  },
  candidateProfile: {
    experience: number;
    education: string;
    previousRoles: string[];
  }
): Promise<PredictionResult> {
  const factors: { positive: string[]; negative: string[] } = { positive: [], negative: [] };

  if (interviewData.score > 80) factors.positive.push("Strong interview performance");
  if (interviewData.score < 50) factors.negative.push("Low interview score");

  if (interviewData.communicationScore > 70) factors.positive.push("Excellent communication");
  if (interviewData.communicationScore < 40) factors.negative.push("Poor communication");

  if (interviewData.technicalDepth > 75) factors.positive.push("Deep technical knowledge");
  if (interviewData.technicalDepth < 40) factors.negative.push("Limited technical depth");

  if (interviewData.problemSolving > 70) factors.positive.push("Strong problem-solving");
  if (interviewData.problemSolving < 40) factors.negative.push("Weak problem-solving");

  if (interviewData.resumeMatchScore > 70) factors.positive.push("Good resume-job fit");
  if (interviewData.resumeMatchScore < 40) factors.negative.push("Poor resume-job fit");

  if (candidateProfile.experience > 5) factors.positive.push("Experienced candidate");
  if (candidateProfile.experience < 2) factors.negative.push("Limited experience");

  const weights = {
    interviewScore: 0.35,
    communication: 0.15,
    technicalDepth: 0.20,
    problemSolving: 0.15,
    resumeMatch: 0.15,
  };

  const successProbability = Math.round(
    (interviewData.score * weights.interviewScore) +
    (interviewData.communicationScore * weights.communication) +
    (interviewData.technicalDepth * weights.technicalDepth) +
    (interviewData.problemSolving * weights.problemSolving) +
    (interviewData.resumeMatchScore * weights.resumeMatch)
  );

  let confidence: "high" | "medium" | "low" = "medium";
  if (factors.positive.length + factors.negative.length > 5) confidence = "high";
  if (factors.positive.length + factors.negative.length < 3) confidence = "low";

  let recommendation: PredictionResult["recommendation"];
  if (successProbability >= 85) recommendation = "strong_hire";
  else if (successProbability >= 70) recommendation = "hire";
  else if (successProbability >= 50) recommendation = "neutral";
  else if (successProbability >= 35) recommendation = "no_hire";
  else recommendation = "strong_no_hire";

  return {
    successProbability,
    confidence,
    factors,
    recommendation,
  };
}

export async function analyzeTechnicalDepth(
  question: string,
  answer: string,
  expectedKeywords: string[]
): Promise<{
  depthScore: number;
  keywordsMatched: string[];
  missingKeywords: string[];
  feedback: string;
}> {
  const answerLower = answer.toLowerCase();
  
  const matchedKeywords = expectedKeywords.filter(kw => 
    answerLower.includes(kw.toLowerCase())
  );
  
  const missingKeywords = expectedKeywords.filter(kw => 
    !answerLower.includes(kw.toLowerCase())
  );

  const depthScore = Math.round((matchedKeywords.length / expectedKeywords.length) * 100);

  let feedback = "";
  if (depthScore >= 80) {
    feedback = "Excellent technical depth. Covered all key concepts.";
  } else if (depthScore >= 60) {
    feedback = "Good understanding but missing some key concepts.";
  } else if (depthScore >= 40) {
    feedback = "Basic understanding. Need more depth in specific areas.";
  } else {
    feedback = "Limited technical understanding. Further study recommended.";
  }

  return {
    depthScore,
    keywordsMatched: matchedKeywords,
    missingKeywords,
    feedback,
  };
}