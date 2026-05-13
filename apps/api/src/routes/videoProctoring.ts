import { Router } from 'express';
import { processVideoFrame, processAudioFrame, checkScreenState, evaluateProctoringSession } from '../lib/videoProctoring';

const router = Router();

interface VideoFrameRequest {
  interviewId: string;
  frameData: string;
  previousPositions?: { x: number; y: number }[];
}

interface AudioFrameRequest {
  interviewId: string;
  audioData: number[];
}

interface SessionEvaluationRequest {
  interviewId: string;
  videoMetrics: {
    timestamp: number;
    faceDetection: {
      present: boolean;
      faceCount: number;
      position: { x: number; y: number; z: number };
      lighting: string;
      occlusion: boolean;
      confidence: number;
    };
    eyeTracking: {
      gazeDirection: string;
      blinkRate: number;
      eyeContactPercentage: number;
      lookingAwayEvents: number;
    };
    expressions: Record<string, number>;
    presence: {
      personCount: number;
      leavingFrame: boolean;
      objectDetection: string[];
      multipleFaces: boolean;
    };
  }[];
  audioMetrics: {
    timestamp: number;
    audio: {
      transcript: string;
      confidence: number;
      language: string;
      voiceCount: number;
      backgroundSounds: string[];
      fillerWords: string[];
      pace: number;
      volume: number;
      clarity: number;
    };
  }[];
  screenMetrics: {
    timestamp: number;
    screen: {
      tabSwitches: number;
      focusLoss: number;
      recordingDetected: boolean;
      externalDisplay: boolean;
      devToolsOpen: boolean;
    };
  }[];
}

router.post('/video/analyze', async (req, res) => {
  try {
    const body = req.body as VideoFrameRequest;

    if (!body.frameData) {
      res.status(400).json({ error: 'Frame data is required' });
      return;
    }

    const metrics = await processVideoFrame(body.frameData, body.previousPositions);
    res.json(metrics);
  } catch (error) {
    console.error('Error analyzing video frame:', error);
    res.status(500).json({ error: 'Failed to analyze video frame' });
  }
});

router.post('/audio/analyze', async (req, res) => {
  try {
    const body = req.body as AudioFrameRequest;

    if (!body.audioData || body.audioData.length === 0) {
      res.status(400).json({ error: 'Audio data is required' });
      return;
    }

    const audioBuffer = new Float32Array(body.audioData);
    const metrics = await processAudioFrame(audioBuffer);
    res.json(metrics);
  } catch (error) {
    console.error('Error analyzing audio frame:', error);
    res.status(500).json({ error: 'Failed to analyze audio frame' });
  }
});

router.post('/screen/check', async (req, res) => {
  try {
    // Use real client-reported tab switch events
    const clientReport = {
      tabSwitchCount: req.body.tabSwitchCount || 0,
      focusLossCount: req.body.focusLossCount || 0,
      recordingDetected: req.body.recordingDetected || false,
      externalDisplay: req.body.externalDisplay || false,
      devToolsOpen: req.body.devToolsOpen || false,
    };

    const metrics = await checkScreenState(clientReport);
    res.json(metrics);
  } catch (error) {
    console.error('Error checking screen state:', error);
    res.status(500).json({ error: 'Failed to check screen state' });
  }
});

router.post('/session/evaluate', async (req, res) => {
  try {
    const body = req.body as SessionEvaluationRequest;

    if (!body.interviewId) {
      res.status(400).json({ error: 'Interview ID is required' });
      return;
    }

    const result = evaluateProctoringSession(
      body.interviewId,
      body.videoMetrics as any,
      body.audioMetrics as any,
      body.screenMetrics as any
    );

    res.json(result);
  } catch (error) {
    console.error('Error evaluating proctoring session:', error);
    res.status(500).json({ error: 'Failed to evaluate session' });
  }
});

router.get('/interview/:interviewId/results', async (req, res) => {
  try {
    const { interviewId } = req.params;

    const mockResult = {
      interviewId,
      riskScore: 25,
      violations: [],
      recommendation: 'pass',
      metricsSummary: {
        totalFacePresentTime: 2700000,
        averageEyeContact: 82,
        tabSwitchCount: 2,
        audioQuality: 88
      }
    };

    res.json(mockResult);
  } catch (error) {
    console.error('Error fetching proctoring results:', error);
    res.status(500).json({ error: 'Failed to fetch proctoring results' });
  }
});

export default router;