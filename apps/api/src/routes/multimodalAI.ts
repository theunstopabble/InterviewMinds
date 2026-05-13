import { Router } from 'express';
import { analyzeMultimodal, detectVoiceAnomalies, calculateEngagementScore } from '../lib/multimodalAI';
import { requireAuth } from '../middleware/auth';

const router = Router();

interface AnalyzeRequest {
  audioText?: string;
  facialData?: Record<string, number>;
  gestureData?: number[];
  eyePositions?: Array<{ x: number; y: number }>;
  postureKeypoints?: Record<string, { x: number; y: number }>;
}

router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const data = req.body as AnalyzeRequest;

    const result = await analyzeMultimodal(
      data.audioText,
      data.facialData,
      data.gestureData,
      data.eyePositions,
      data.postureKeypoints
    );

    const engagementScore = calculateEngagementScore(result);

    res.json({
      ...result,
      engagementScore,
    });
  } catch (error) {
    console.error('Error analyzing multimodal:', error);
    res.status(500).json({ error: 'Failed to analyze multimodal data' });
  }
});

router.post('/voice/analyze', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;

    const result = await analyzeMultimodal(text);

    res.json(result.voice);
  } catch (error) {
    console.error('Error analyzing voice:', error);
    res.status(500).json({ error: 'Failed to analyze voice' });
  }
});

router.post('/facial/analyze', requireAuth, async (req, res) => {
  try {
    const expressions = req.body as Record<string, number>;

    const result = await analyzeMultimodal(undefined, expressions);

    res.json(result.facial);
  } catch (error) {
    console.error('Error analyzing facial:', error);
    res.status(500).json({ error: 'Failed to analyze facial expressions' });
  }
});

router.post('/eye-gaze/analyze', requireAuth, async (req, res) => {
  try {
    const positions = req.body.positions as Array<{ x: number; y: number }>;

    const result = await analyzeMultimodal(undefined, undefined, undefined, positions);

    res.json(result.eyeGaze);
  } catch (error) {
    console.error('Error analyzing eye gaze:', error);
    res.status(500).json({ error: 'Failed to analyze eye gaze' });
  }
});

router.post('/posture/analyze', requireAuth, async (req, res) => {
  try {
    const keypoints = req.body as Record<string, { x: number; y: number }>;

    const result = await analyzeMultimodal(undefined, undefined, undefined, undefined, keypoints);

    res.json(result.posture);
  } catch (error) {
    console.error('Error analyzing posture:', error);
    res.status(500).json({ error: 'Failed to analyze posture' });
  }
});

router.post('/voice/anomaly', requireAuth, async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    const buffer = Buffer.from(audioBase64, 'base64');

    const anomalies = await detectVoiceAnomalies(buffer);

    res.json({ anomalies });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect voice anomalies' });
  }
});

router.get('/engagement/score/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    res.json({
      sessionId,
      score: 75,
      status: 'active',
    });
  } catch (error) {
    console.error('Error getting engagement:', error);
    res.status(500).json({ error: 'Failed to get engagement score' });
  }
});

export default router;