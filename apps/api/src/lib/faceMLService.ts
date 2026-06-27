/**
 * Face ML Service - Wraps @vladmandic/face-api for face detection, landmark, and expression recognition.
 * 
 * This module handles:
 * - Loading face-api.js with proper TensorFlow.js backend
 * - Model initialization (SSD MobileNet + Face Landmark + Face Expression)
 * - Inference on frame buffers
 * - Graceful degradation when models cannot be loaded
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from "./logger";

// Types for face-api results (avoid importing face-api at module level due to env issues)
export interface MLFaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export interface MLFaceLandmarks {
  leftEye: { x: number; y: number }[];
  rightEye: { x: number; y: number }[];
  nose: { x: number; y: number }[];
  mouth: { x: number; y: number }[];
  jawOutline: { x: number; y: number }[];
}

export interface MLExpressions {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
}

export interface MLAnalysisResult {
  detection: MLFaceDetection | null;
  landmarks: MLFaceLandmarks | null;
  expressions: MLExpressions | null;
  faceCount: number;
}

let faceapi: any = null;
let modelsLoaded = false;
let modelLoadAttempted = false;
let modelLoadError: string | null = null;

const MODEL_DIR = path.resolve(__dirname, '../../models/face-api');

/**
 * Attempt to initialize face-api.js and load models.
 * This is called once at startup. If it fails, the system falls back to
 * content-derived heuristics (not static values).
 */
export async function initializeFaceML(): Promise<boolean> {
  if (modelLoadAttempted) return modelsLoaded;
  modelLoadAttempted = true;

  try {
    // Dynamically import face-api to handle environments where it can't load
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();

    // Try to load face-api with the JS backend
    try {
      faceapi = await import('@vladmandic/face-api/dist/face-api.js');
    } catch {
      // Try alternative import path
      faceapi = require('@vladmandic/face-api/dist/face-api.js');
    }

    // Check if model directory exists
    if (!fs.existsSync(MODEL_DIR)) {
      modelLoadError = `Model directory not found: ${MODEL_DIR}`;
      logger.warn(`[VideoProctoring] ML models not available: ${modelLoadError}. Using content-derived analysis.`);
      return false;
    }

    // Load the models
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
    await faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_DIR);

    modelsLoaded = true;
    logger.info('[VideoProctoring] Face-api.js ML models loaded successfully');
    return true;
  } catch (err: any) {
    modelLoadError = err?.message || String(err);
    logger.warn(`[VideoProctoring] Failed to load ML models: ${modelLoadError}. Using content-derived analysis.`);
    return false;
  }
}

/**
 * Run ML inference on a frame buffer using face-api.js.
 * Returns null if models are not loaded.
 */
export async function runMLInference(imageBuffer: Buffer): Promise<MLAnalysisResult | null> {
  if (!modelsLoaded || !faceapi) return null;

  try {
    const tensor = faceapi.tf.node.decodeImage(imageBuffer, 3);
    const detections = await faceapi
      .detectAllFaces(tensor)
      .withFaceLandmarks()
      .withFaceExpressions();

    tensor.dispose();

    if (!detections || detections.length === 0) {
      return { detection: null, landmarks: null, expressions: null, faceCount: 0 };
    }

    const primary = detections[0];
    const box = primary.detection.box;

    return {
      detection: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        score: primary.detection.score,
      },
      landmarks: {
        leftEye: primary.landmarks.getLeftEye().map((p: any) => ({ x: p.x, y: p.y })),
        rightEye: primary.landmarks.getRightEye().map((p: any) => ({ x: p.x, y: p.y })),
        nose: primary.landmarks.getNose().map((p: any) => ({ x: p.x, y: p.y })),
        mouth: primary.landmarks.getMouth().map((p: any) => ({ x: p.x, y: p.y })),
        jawOutline: primary.landmarks.getJawOutline().map((p: any) => ({ x: p.x, y: p.y })),
      },
      expressions: {
        neutral: primary.expressions.neutral,
        happy: primary.expressions.happy,
        sad: primary.expressions.sad,
        angry: primary.expressions.angry,
        fearful: primary.expressions.fearful,
        disgusted: primary.expressions.disgusted,
        surprised: primary.expressions.surprised,
      },
      faceCount: detections.length,
    };
  } catch (err: any) {
    logger.warn(`[VideoProctoring] ML inference failed: ${err?.message}. Falling back to content-derived analysis.`);
    return null;
  }
}

export function isMLAvailable(): boolean {
  return modelsLoaded;
}

export function getMLStatus(): { loaded: boolean; error: string | null } {
  return { loaded: modelsLoaded, error: modelLoadError };
}
