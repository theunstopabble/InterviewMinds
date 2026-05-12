import { logger } from "./logger";

export interface SentimentResult {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
  keyPhrases: string[];
}

export interface ConversationAnalysis {
  overallSentiment: SentimentResult;
  sentimentTrend: Array<{ timestamp: Date; score: number }>;
  engagementLevel: "high" | "medium" | "low";
  topicShift: string[];
  questionResponse: {
    clarity: number;
    enthusiasm: number;
    coherence: number;
  };
}

export function analyzeSentiment(text: string): SentimentResult {
  const positiveWords = [
    "great", "excellent", "amazing", "wonderful", "fantastic", "love",
    "perfect", "best", "good", "happy", "excited", "confident", "passionate",
    "enjoy", "interesting", "challenging", "opportunity", "growth", "learn"
  ];

  const negativeWords = [
    "bad", "terrible", "awful", "hate", "worst", "poor", "difficult",
    "frustrated", "annoyed", "boring", "confused", "struggle", "problem",
    "issue", "fail", "mistake", "wrong", "disappointed", "stress", "anxious"
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  const foundPhrases: string[] = [];

  words.forEach(word => {
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (positiveWords.includes(cleanWord)) {
      positiveCount++;
      if (!foundPhrases.includes(cleanWord)) foundPhrases.push(cleanWord);
    }
    if (negativeWords.includes(cleanWord)) {
      negativeCount++;
      if (!foundPhrases.includes(cleanWord)) foundPhrases.push(cleanWord);
    }
  });

  const total = positiveCount + negativeCount || 1;
  const score = Math.round(((positiveCount - negativeCount + 50) / 100) * 100);
  
  let label: SentimentResult["label"] = "neutral";
  if (score > 55) label = "positive";
  else if (score < 45) label = "negative";

  const emotions = {
    joy: Math.min(100, positiveCount * 15 + (label === "positive" ? 30 : 0)),
    anger: negativeCount * 12,
    sadness: negativeCount * 8,
    fear: text.toLowerCase().includes("worried") || text.toLowerCase().includes("nervous") ? 40 : 10,
    surprise: text.includes("!") ? 25 : 5,
  };

  return {
    score,
    label,
    confidence: Math.min(95, 50 + total * 5),
    emotions,
    keyPhrases: foundPhrases.slice(0, 5),
  };
}

export function analyzeConversation(
  responses: Array<{ text: string; timestamp: number }>
): ConversationAnalysis {
  if (responses.length === 0) {
    return {
      overallSentiment: { score: 50, label: "neutral", confidence: 0, emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 }, keyPhrases: [] },
      sentimentTrend: [],
      engagementLevel: "low",
      topicShift: [],
      questionResponse: { clarity: 0, enthusiasm: 0, coherence: 0 },
    };
  }

  const sentimentScores = responses.map(r => {
    const result = analyzeSentiment(r.text);
    return { timestamp: new Date(r.timestamp), score: result.score };
  });

  const avgScore = sentimentScores.reduce((sum, s) => sum + s.score, 0) / sentimentScores.length;
  const overallSentiment = analyzeSentiment(responses.map(r => r.text).join(" "));

  const responseLengths = responses.map(r => r.text.split(/\s+/).length);
  const avgLength = responseLengths.reduce((a, b) => a + b, 0) / responseLengths.length;
  
  let engagementLevel: ConversationAnalysis["engagementLevel"] = "low";
  if (avgLength > 50 || responses.length > 5) engagementLevel = "high";
  else if (avgLength > 20) engagementLevel = "medium";

  const topics = new Set<string>();
  responses.forEach(r => {
    const lower = r.text.toLowerCase();
    if (lower.includes("team") || lower.includes("colleague")) topics.add("teamwork");
    if (lower.includes("project") || lower.includes("built")) topics.add("projects");
    if (lower.includes("problem") || lower.includes("solve")) topics.add("problem-solving");
    if (lower.includes("lead") || lower.includes("manage")) topics.add("leadership");
  });

  const questionResponse = {
    clarity: Math.min(100, 50 + avgLength),
    enthusiasm: Math.min(100, 50 + (overallSentiment.emotions.joy / 2)),
    coherence: responses.length > 1 ? 75 : 50,
  };

  return {
    overallSentiment,
    sentimentTrend: sentimentScores,
    engagementLevel,
    topicShift: Array.from(topics),
    questionResponse,
  };
}

export function compareCandidateSentiment(
  candidateResponses: Array<{ text: string; timestamp: number }>,
  idealResponses: string[]
): {
  similarity: number;
  areasOfDifference: string[];
  recommendation: string;
} {
  const candidateAnalysis = analyzeConversation(candidateResponses);
  const idealSentiment = analyzeSentiment(idealResponses.join(" "));

  const scoreDiff = Math.abs(candidateAnalysis.overallSentiment.score - idealSentiment.score);
  const similarity = Math.max(0, 100 - scoreDiff);

  const differences: string[] = [];
  if (candidateAnalysis.engagementLevel === "low") differences.push("Lower engagement");
  if (candidateAnalysis.overallSentiment.label === "negative") differences.push("Negative sentiment");

  let recommendation = "Neutral fit";
  if (similarity > 80) recommendation = "Strong cultural fit";
  else if (similarity > 60) recommendation = "Good fit";
  else if (similarity < 40) recommendation = "May need development";

  return {
    similarity,
    areasOfDifference: differences,
    recommendation,
  };
}