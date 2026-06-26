import { Router } from 'express';
import { logger } from '../lib/logger';
import { analyzeMultimodal, detectVoiceAnomalies, calculateEngagementScore } from '../lib/multimodalAI';
import { requireAuth } from '../middleware/auth';
import { ProctoringSessionModel } from '../models/ProctoringSession';

const router = Router();

router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { audioText, facialData, gestureData, eyePositions, postureKeypoints, interviewId } = req.body;

    const result = await analyzeMultimodal(
      audioText,
      facialData,
      gestureData,
      eyePositions,
      postureKeypoints
    );

    const engagementScore = calculateEngagementScore(result);

    if (interviewId) {
      try {
        const session = await ProctoringSessionModel.findOne({ interviewId }).sort({ createdAt: -1 });
        if (session) {
          session.multimodalAnalysis = {
            voice: result.voice,
            facial: result.facial,
            gestures: result.gestures,
            eyeGaze: result.eyeGaze,
            posture: result.posture,
            overallScore: result.overallScore,
            warnings: result.warnings,
          };
          await session.save();
        }
      } catch (err) {
        logger.error({ err, interviewId }, 'Failed to persist multimodal analysis');
      }
    }

    res.json({
      ...result,
      engagementScore,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing multimodal');
    res.status(500).json({ error: 'Failed to analyze multimodal data' });
  }
});

router.post('/voice/analyze', requireAuth, async (req, res) => {
  try {
    const { text, interviewId } = req.body;

    const result = await analyzeMultimodal(text);

    if (interviewId) {
      try {
        await ProctoringSessionModel.findOneAndUpdate(
          { interviewId, status: 'active' },
          { $set: { 'multimodalAnalysis.voice': result.voice } },
        );
      } catch (err) {
        logger.error({ err, interviewId }, 'Failed to persist voice analysis');
      }
    }

    res.json(result.voice);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing voice');
    res.status(500).json({ error: 'Failed to analyze voice' });
  }
});

router.post('/facial/analyze', requireAuth, async (req, res) => {
  try {
    const expressions = req.body as Record<string, number>;

    const result = await analyzeMultimodal(undefined, expressions);

    res.json(result.facial);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing facial');
    res.status(500).json({ error: 'Failed to analyze facial expressions' });
  }
});

router.post('/eye-gaze/analyze', requireAuth, async (req, res) => {
  try {
    const positions = req.body.positions as Array<{ x: number; y: number }>;

    const result = await analyzeMultimodal(undefined, undefined, undefined, positions);

    res.json(result.eyeGaze);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing eye gaze');
    res.status(500).json({ error: 'Failed to analyze eye gaze' });
  }
});

router.post('/posture/analyze', requireAuth, async (req, res) => {
  try {
    const keypoints = req.body as Record<string, { x: number; y: number }>;

    const result = await analyzeMultimodal(undefined, undefined, undefined, undefined, keypoints);

    res.json(result.posture);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing posture');
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
    logger.error({ err: error }, 'Error detecting anomalies');
    res.status(500).json({ error: 'Failed to detect voice anomalies' });
  }
});

router.get('/engagement/score/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const doc = await ProctoringSessionModel.findOne({ interviewId: sessionId })
      .sort({ createdAt: -1 })
      .select('multimodalAnalysis status')
      .lean();

    if (doc?.multimodalAnalysis) {
      res.json({
        sessionId,
        score: doc.multimodalAnalysis.overallScore || 75,
        status: doc.status || 'active',
      });
      return;
    }

    res.json({
      sessionId,
      score: 75,
      status: 'active',
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting engagement');
    res.status(500).json({ error: 'Failed to get engagement score' });
  }
});

export default router;
