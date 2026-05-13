import { logger } from "./logger";
import Groq from "groq-sdk";

export interface VoiceAnalysisResult {
  confidence: number;
  nervousness: number;
  enthusiasm: number;
  clarity: number;
  pace: number;
  sentiment: "positive" | "negative" | "neutral";
  warnings: string[];
  source: "groq" | "heuristic_fallback";
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

/* ------------------------------------------------------------------ */
/*  Voice Analysis — Groq LLM primary with keyword heuristic fallback */
/* ------------------------------------------------------------------ */

function getGroqClient(): Groq | null {
  const key = process.env.GROQ_API_KEY;
  return key ? new Groq({ apiKey: key }) : null;
}

/**
 * Compute acoustic features from raw audio buffer if available.
 * Returns contextual information for the Groq prompt.
 */
function computeAcousticFeatures(audioBuffer?: Buffer): {
  pitchVariance: number | null;
  speakingRate: number | null;
  pauseFrequency: number | null;
} | null {
  if (!audioBuffer || audioBuffer.length === 0) return null;

  // Analyze raw audio buffer for acoustic features
  const samples = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, Math.floor(audioBuffer.length / 4));
  if (samples.length < 100) return null;

  // Estimate pitch variance from zero-crossing rate variation
  let zeroCrossings = 0;
  const windowSize = Math.min(1024, Math.floor(samples.length / 4));
  const windowCrossings: number[] = [];

  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
      zeroCrossings++;
    }
    if (i % windowSize === 0 && zeroCrossings > 0) {
      windowCrossings.push(zeroCrossings);
      zeroCrossings = 0;
    }
  }

  const avgCrossings = windowCrossings.length > 0
    ? windowCrossings.reduce((a, b) => a + b, 0) / windowCrossings.length
    : 0;
  const pitchVariance = windowCrossings.length > 1
    ? windowCrossings.reduce((sum, v) => sum + Math.pow(v - avgCrossings, 2), 0) / windowCrossings.length
    : 0;

  // Estimate speaking rate from energy bursts (syllable-like segments)
  const energyThreshold = 0.01;
  let inSpeech = false;
  let speechBursts = 0;
  for (let i = 0; i < samples.length; i++) {
    const energy = samples[i] * samples[i];
    if (energy > energyThreshold && !inSpeech) {
      speechBursts++;
      inSpeech = true;
    } else if (energy <= energyThreshold) {
      inSpeech = false;
    }
  }

  // Estimate pause frequency from silence gaps
  let pauseCount = 0;
  let silenceFrames = 0;
  const silenceThreshold = 20; // frames of silence to count as a pause
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) < 0.005) {
      silenceFrames++;
    } else {
      if (silenceFrames > silenceThreshold) pauseCount++;
      silenceFrames = 0;
    }
  }

  return {
    pitchVariance: Math.round(pitchVariance * 100) / 100,
    speakingRate: speechBursts,
    pauseFrequency: pauseCount,
  };
}

/**
 * Keyword-based heuristic analysis — used as fallback when Groq is unavailable.
 * Results are flagged with source: "heuristic_fallback".
 */
function analyzeVoiceToneHeuristic(text: string): VoiceAnalysisResult {
  const words = text.toLowerCase().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(Boolean);

  const confidenceWords = ["definitely", "certainly", "sure", "absolutely", "confident", "know", "understand"];
  const nervousnessWords = ["um", "uh", "like", "maybe", "sort of", "i think", "probably", "perhaps"];
  const enthusiasmWords = ["great", "excited", "love", "awesome", "amazing", "fantastic", "interesting"];

  let confidence = 50, nervousness = 20, enthusiasm = 50;

  confidenceWords.forEach(w => { if (text.toLowerCase().includes(w)) confidence += 10; });
  nervousnessWords.forEach(w => { if (text.toLowerCase().includes(w)) nervousness += 15; });
  enthusiasmWords.forEach(w => { if (text.toLowerCase().includes(w)) enthusiasm += 10; });

  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const paceLabel = avgWordsPerSentence < 10 ? "slow" : avgWordsPerSentence > 20 ? "fast" : "normal";

  const warnings: string[] = [];
  if (nervousness > 60) warnings.push("High nervousness detected");
  if (confidence < 30) warnings.push("Low confidence detected");
  if (paceLabel === "fast") warnings.push("Speaking too fast");

  const sentiment: "positive" | "negative" | "neutral" =
    enthusiasm > 70 ? "positive" : confidence > 60 ? "neutral" : "negative";

  return {
    confidence: Math.min(100, confidence),
    nervousness: Math.min(100, nervousness),
    enthusiasm: Math.min(100, enthusiasm),
    clarity: 85,
    pace: paceLabel === "slow" ? 40 : paceLabel === "fast" ? 60 : 80,
    sentiment,
    warnings,
    source: "heuristic_fallback",
  };
}

/**
 * Primary voice tone analysis using Groq LLM.
 * Falls back to keyword heuristic if Groq is unavailable, marking result with source: "heuristic_fallback".
 */
async function analyzeVoiceTone(text: string, audioBuffer?: Buffer): Promise<VoiceAnalysisResult> {
  // Attempt Groq as the primary analysis path
  const groq = getGroqClient();

  if (!groq) {
    logger.warn("Groq API key not configured — falling back to keyword heuristic for voice tone analysis");
    return analyzeVoiceToneHeuristic(text);
  }

  try {
    // Compute acoustic features if raw audio buffer is available
    const acousticFeatures = computeAcousticFeatures(audioBuffer);
    const acousticContext = acousticFeatures
      ? `\n\nAcoustic features detected from audio: pitch variance=${acousticFeatures.pitchVariance}, speaking rate (syllable bursts)=${acousticFeatures.speakingRate}, pause frequency=${acousticFeatures.pauseFrequency}.`
      : "";

    const prompt = `You are an expert interview coach analyzing a candidate's voice tone from their spoken response transcript.${acousticContext}

Analyze the following interview response and return scores for each dimension.

Scoring guide:
- confidence (0-100): How confident does the speaker sound? Look for assertive language, decisive statements, and lack of hedging.
- nervousness (0-100): How nervous does the speaker sound? Look for filler words, hedging, repetition, and uncertainty markers.
- enthusiasm (0-100): How enthusiastic/engaged does the speaker sound? Look for positive language, energy, and interest markers.
- clarity (0-100): How clear and articulate is the response? Look for coherent structure, precise language, and logical flow.
- pace (0-100): Speaking pace score where 0=very slow, 50=normal, 100=very fast. Estimate from sentence length and word density.
- sentiment: Overall emotional tone — must be exactly one of: "positive", "negative", or "neutral".

Return ONLY valid JSON with no additional text:
{"confidence":N,"nervousness":N,"enthusiasm":N,"clarity":N,"pace":N,"sentiment":"..."}

Transcript: "${text.slice(0, 2000)}"`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("Groq returned non-JSON response for voice tone — falling back to heuristic");
      return analyzeVoiceToneHeuristic(text);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clamp all scores
    const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));
    const nervousness = Math.min(100, Math.max(0, Number(parsed.nervousness) || 20));
    const enthusiasm = Math.min(100, Math.max(0, Number(parsed.enthusiasm) || 50));
    const clarity = Math.min(100, Math.max(0, Number(parsed.clarity) || 70));
    const pace = Math.min(100, Math.max(0, Number(parsed.pace) || 50));
    const sentiment: "positive" | "negative" | "neutral" =
      ["positive", "negative", "neutral"].includes(parsed.sentiment) ? parsed.sentiment : "neutral";

    const warnings: string[] = [];
    if (nervousness > 60) warnings.push("High nervousness detected");
    if (confidence < 30) warnings.push("Low confidence detected");
    if (pace > 80) warnings.push("Speaking too fast");

    return {
      confidence,
      nervousness,
      enthusiasm,
      clarity,
      pace,
      sentiment,
      warnings,
      source: "groq",
    };
  } catch (error) {
    logger.warn({ error }, "Groq voice tone analysis failed — falling back to keyword heuristic");
    return analyzeVoiceToneHeuristic(text);
  }
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

export async function analyzeMultimodal(
  audioText?: string,
  facialData?: Record<string, number>,
  gestureData?: number[],
  eyePositions?: Array<{ x: number; y: number }>,
  postureKeypoints?: Record<string, { x: number; y: number }>
): Promise<MultimodalAnalysis> {
  logger.info({ audioText: audioText?.slice(0, 50) }, "Running multimodal analysis");

  const voice = audioText ? await analyzeVoiceTone(audioText) : {
    confidence: 0, nervousness: 0, enthusiasm: 0, clarity: 0, pace: 0 as any,
    sentiment: "neutral" as const, warnings: ["No audio data"],
    source: "heuristic_fallback" as const,
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