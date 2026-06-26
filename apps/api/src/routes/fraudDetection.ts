import { Router } from 'express';
import { logger } from '../lib/logger';
import { detectFraud, createFingerprint, getSessionAnalysis } from '../lib/fraudDetection';

const router = Router();

interface FraudDetectionRequest {
  fingerprint: {
    userAgent: string;
    screen: { width: number; height: number };
    timezone: string;
    language: string;
    platform: string;
    plugins: string[];
  };
  behavior?: {
    mouseMovements: { x: number; y: number; timestamp: number }[];
    keystrokeTimings: number[];
    scrollBehavior: { totalScrolls: number; avgScrollDistance: number; scrollSpeed: number };
    clickPattern: { totalClicks: number; avgTimeBetweenClicks: number };
  };
  session: {
    ipAddress: string;
    ipChange: boolean;
    deviceChange: boolean;
    locationChange: boolean;
    concurrentSessions: number;
    sessionStartTime: number;
  };
  userId?: string;
}

router.post('/analyze', async (req, res) => {
  try {
    const body = req.body as FraudDetectionRequest;

    if (!body.fingerprint || !body.session) {
      res.status(400).json({ 
        error: 'Missing required fields: fingerprint and session' 
      });
      return;
    }

    const fingerprint = createFingerprint(
      body.fingerprint.userAgent,
      body.fingerprint.screen,
      body.fingerprint.timezone,
      body.fingerprint.language,
      body.fingerprint.platform,
      body.fingerprint.plugins
    );

    const sessionId = crypto.randomUUID();
    const result = await detectFraud(
      fingerprint,
      body.behavior || {
        mouseMovements: [],
        keystrokeTimings: [],
        scrollBehavior: { totalScrolls: 0, avgScrollDistance: 0, scrollSpeed: 0 },
        clickPattern: { totalClicks: 0, avgTimeBetweenClicks: 0 }
      },
      body.session,
      [],
      sessionId,
      body.userId
    );

    res.json({
      ...result,
      sessionId,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in fraud detection');
    res.status(500).json({ error: 'Failed to analyze fraud risk' });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await getSessionAnalysis(sessionId);

    if (!result) {
      res.status(404).json({ error: 'Session analysis not found' });
      return;
    }

    res.json({
      sessionId,
      ...result,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching session analysis');
    res.status(500).json({ error: 'Failed to fetch session analysis' });
  }
});

export default router;
