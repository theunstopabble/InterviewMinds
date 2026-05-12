import { logger } from "./logger";

export interface VoiceAnalysisResult {
  confidence: number;
  nervousness: number;
  enthusiasm: number;
  clarity: number;
  pace: number;
  sentiment: "positive" | "negative" | "neutral";
  warnings: string[];
}

export interface FacialAnalysisResult {
  expressions: {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    neutral: number;
    fearful: number;
    disgusted: number;
  };
  dominantEmotion: string;
  engagementScore: number;
  eyeContact: number;
  blinkRate: number;
  warnings: string[];
}

export interface GestureResult {
  gestures: string[];
  fidgeting: number;
  confidenceSignals: number;
  overallBodyLanguage: "positive" | "neutral" | "negative";
}

export interface EyeGazeResult {
  gazeDirection: "left" | "right" | "center" | "down";
  lookingAtScreen: number;
  lookingAwayCount: number;
  notesUsed: boolean;
  suspicious: boolean;
}

export interface PostureResult {
  posture: "slouching" | "leaningForward" | "upright" | "neutral";
  engagementLevel: number;
  confidenceScore: number;
}

export interface MultimodalAnalysis {
  voice: VoiceAnalysisResult;
  facial: FacialAnalysisResult;
  gestures: GestureResult;
  eyeGaze: EyeGazeResult;
  posture: PostureResult;
  overallScore: number;
  warnings: string[];
}

function analyzeVoiceTone(text: string): VoiceAnalysisResult {
  const words = text.toLowerCase().split(" ");
  const sentences = text.split(/[.!?]+/);

  const confidenceWords = ["definitely", "certainly", "sure", "absolutely", "confident", "know", "understand"];
  const nervousnessWords = ["um", "uh", "like", "maybe", "sort of", "i think", "probably", "perhaps"];
  const enthusiasmWords = ["great", "excited", "love", "awesome", "amazing", "fantastic", "interesting"];

  let confidence = 50, nervousness = 20, enthusiasm = 50;
  let sentenceCount = 0;

  confidenceWords.forEach(w => { if (text.toLowerCase().includes(w)) confidence += 10; });
  nervousnessWords.forEach(w => { if (text.toLowerCase().includes(w)) nervousness += 15; });
  enthusiasmWords.forEach(w => { if (text.toLowerCase().includes(w)) enthusiasm += 10; });

  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const pace = avgWordsPerSentence < 10 ? "slow" : avgWordsPerSentence > 20 ? "fast" : "normal";

  const warnings: string[] = [];
  if (nervousness > 60) warnings.push("High nervousness detected");
  if (confidence < 30) warnings.push("Low confidence detected");
  if (pace === "fast") warnings.push("Speaking too fast");

  return {
    confidence: Math.min(100, confidence),
    nervousness: Math.min(100, nervousness),
    enthusiasm: Math.min(100, enthusiasm),
    clarity: 85,
    pace: pace === "slow" ? 40 : pace === "fast" ? 60 : 80,
    sentiment: enthusiasm > 70 ? "positive" : confidence > 60 ? "neutral" : "negative",
    warnings,
  };
}

function analyzeFacialExpressions(expressions: Record<string, number>): FacialAnalysisResult {
  const dominantEmotion = Object.entries(expressions).reduce((a, b) => 
    (a[1] > b[1] ? a : b))[0];

  const engagementScore = expressions.neutral > 50 ? 70 : expressions.happy > 20 ? 85 : 50;
  const eyeContact = expressions.happy && expressions.surprised ? 80 : 60;
  const blinkRate = 15;

  const warnings: string[] = [];
  if (expressions.sad > 30) warnings.push("Candidate appears sad");
  if (expressions.angry > 20) warnings.push("Anger detected");
  if (expressions.fearful > 20) warnings.push("Fear/anxiety detected")

  return {
    expressions: {
      happy: expressions.happy || 20,
      sad: expressions.sad || 10,
      angry: expressions.angry || 5,
      surprised: expressions.surprised || 10,
      neutral: expressions.neutral || 45,
      fearful: expressions.fearful || 5,
      disgusted: expressions.disgusted || 5,
    },
    dominantEmotion,
    engagementScore,
    eyeContact,
    blinkRate,
    warnings,
  };
}

function analyzeGestures(frameData: number[]): GestureResult {
  const gestures: string[] = [];
  let fidgeting = 20;
  let confidenceSignals = 60;

  if (frameData.length > 0) {
    const movement = Math.abs(frameData.reduce((a, b) => a + b, 0));
    if (movement > 5000) {
      fidgeting = 70;
      gestures.push("excessive movement");
    } else if (movement > 2000) {
      fidgeting = 40;
      gestures.push("normal movement");
    } else {
      gestures.push("still");
    }
  }

  const overallBodyLanguage: "positive" | "neutral" | "negative" = 
    fidgeting < 40 ? "positive" : fidgeting < 60 ? "neutral" : "negative";

  return {
    gestures,
    fidgeting,
    confidenceSignals,
    overallBodyLanguage,
  };
}

function analyzeEyeGaze(positions: Array<{ x: number; y: number }>): EyeGazeResult {
  if (positions.length === 0) {
    return {
      gazeDirection: "center",
      lookingAtScreen: 80,
      lookingAwayCount: 0,
      notesUsed: false,
      suspicious: false,
    };
  }

  const avgX = positions.reduce((a, p) => a + p.x, 0) / positions.length;
  const avgY = positions.reduce((a, p) => a + p.y, 0) / positions.length;

  let gazeDirection: "left" | "right" | "center" | "down" = "center";
  if (avgX < -0.2) gazeDirection = "left";
  else if (avgX > 0.2) gazeDirection = "right";
  else if (avgY > 0.2) gazeDirection = "down";

  const centerPositions = positions.filter(p => Math.abs(p.x) < 0.2 && Math.abs(p.y) < 0.2).length;
  const lookingAtScreen = Math.round((centerPositions / positions.length) * 100);

  const notesUsed = avgY > 0.3;
  const suspicious = lookingAtScreen < 50;

  return {
    gazeDirection,
    lookingAtScreen,
    lookingAwayCount: Math.floor((100 - lookingAtScreen) / 10),
    notesUsed,
    suspicious,
  };
}

function analyzePosture(keypoints: Record<string, { x: number; y: number }>): PostureResult {
  const nose = keypoints.nose;
  const shoulders = keypoints.shoulders;

  if (!nose || !shoulders) {
    return {
      posture: "neutral",
      engagementLevel: 70,
      confidenceScore: 70,
    };
  }

  const shoulderMid = (shoulders.x || 0);
  const offset = (nose.x || 0) - shoulderMid;

  let posture: "slouching" | "leaningForward" | "upright" | "neutral" = "neutral";
  if (offset < -0.15) posture = "slouching";
  else if (offset > 0.15) posture = "leaningForward";
  else posture = "upright";

  const engagementLevel = posture === "upright" ? 90 : posture === "leaningForward" ? 80 : 50;
  const confidenceScore = posture === "upright" ? 85 : posture === "leaningForward" ? 75 : 50;

  return {
    posture,
    engagementLevel,
    confidenceScore,
  };
}

export function analyzeMultimodal(
  audioText?: string,
  facialData?: Record<string, number>,
  gestureData?: number[],
  eyePositions?: Array<{ x: number; y: number }>,
  postureKeypoints?: Record<string, { x: number; y: number }>
): MultimodalAnalysis {
  logger.info({ audioText: audioText?.slice(0, 50) }, "Running multimodal analysis");

  const voice = audioText ? analyzeVoiceTone(audioText) : {
    confidence: 0, nervousness: 0, enthusiasm: 0, clarity: 0, pace: 0 as any,
    sentiment: "neutral" as const, warnings: ["No audio data"] 
  };

  const facial = facialData ? analyzeFacialExpressions(facialData) : {
    expressions: { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, fearful: 0, disgusted: 0 },
    dominantEmotion: "unknown", engagementScore: 0, eyeContact: 0, blinkRate: 0, warnings: [] 
  };

  const gestures = gestureData ? analyzeGestures(gestureData) : {
    gestures: [], fidgeting: 0, confidenceSignals: 0, overallBodyLanguage: "neutral" as const 
  };

  const eyeGaze = eyePositions ? analyzeEyeGaze(eyePositions) : {
    gazeDirection: "center" as const, lookingAtScreen: 0, lookingAwayCount: 0, notesUsed: false, suspicious: false 
  };

  const posture = postureKeypoints ? analyzePosture(postureKeypoints) : {
    posture: "neutral" as const, engagementLevel: 0, confidenceScore: 0 
  };

  const allWarnings = [
    ...voice.warnings,
    ...facial.warnings,
    eyeGaze.suspicious ? "Suspicious eye gaze detected" : "",
  ].filter(Boolean);

  const overallScore = Math.round(
    (voice.confidence * 0.2) +
    (facial.engagementScore * 0.25) +
    (gestures.confidenceSignals * 0.15) +
    (eyeGaze.lookingAtScreen * 0.2) +
    (posture.engagementLevel * 0.2)
  );

  return {
    voice,
    facial,
    gestures,
    eyeGaze,
    posture,
    overallScore,
    warnings: allWarnings,
  };
}

export async function detectVoiceAnomalies(audioBuffer: Buffer): Promise<{
  anomaly: string;
  severity: "low" | "medium" | "high";
  description: string;
}[]> {
  return [];
}

export function calculateEngagementScore(multimodal: MultimodalAnalysis): number {
  return multimodal.overallScore;
}