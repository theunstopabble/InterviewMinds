import { Router } from 'express';
import { logger } from '../lib/logger';
import { processVideoFrame, processAudioFrame, checkScreenState, evaluateAndSaveSession, fetchProctoringResults } from '../lib/videoProctoring';

const router = Router();

router.post('/video/analyze', async (req, res) => {
  try {
    const { frameData, previousPositions, interviewId } = req.body;

    if (!frameData) {
      res.status(400).json({ error: 'Frame data is required' });
      return;
    }

    const metrics = await processVideoFrame(frameData, previousPositions, interviewId);
    res.json(metrics);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing video frame');
    res.status(500).json({ error: 'Failed to analyze video frame' });
  }
});

router.post('/audio/analyze', async (req, res) => {
  try {
    const { audioData, interviewId } = req.body;

    if (!audioData || audioData.length === 0) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const audioBuffer = new Float32Array(audioData);
    const metrics = await processAudioFrame(audioBuffer, interviewId);
    res.json(metrics);
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing audio frame');
    res.status(500).json({ error: 'Failed to analyze audio frame' });
  }
});

router.post('/screen/check', async (req, res) => {
  try {
    const { interviewId } = req.body;
    const clientReport = {
      tabSwitchCount: req.body.tabSwitchCount || 0,
      focusLossCount: req.body.focusLossCount || 0,
      recordingDetected: req.body.recordingDetected || false,
      externalDisplay: req.body.externalDisplay || false,
      devToolsOpen: req.body.devToolsOpen || false,
    };

    const metrics = await checkScreenState(clientReport, interviewId);
    res.json(metrics);
  } catch (error) {
    logger.error({ err: error }, 'Error checking screen state');
    res.status(500).json({ error: 'Failed to check screen state' });
  }
});

router.post('/session/evaluate', async (req, res) => {
  try {
    const { interviewId, videoMetrics, audioMetrics, screenMetrics } = req.body;

    if (!interviewId) {
      res.status(400).json({ error: 'Interview ID is required' });
      return;
    }

    const result = await evaluateAndSaveSession(
      interviewId,
      videoMetrics || [],
      audioMetrics || [],
      screenMetrics || []
    );

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error evaluating proctoring session');
    res.status(500).json({ error: 'Failed to evaluate session' });
  }
});

router.get('/interview/:interviewId/results', async (req, res) => {
  try {
    const { interviewId } = req.params;

    const result = await fetchProctoringResults(interviewId);

    if (!result) {
      res.status(404).json({ error: 'Proctoring results not found for this interview' });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching proctoring results');
    res.status(500).json({ error: 'Failed to fetch proctoring results' });
  }
});

export default router;
