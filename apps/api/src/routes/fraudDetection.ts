import { Router } from 'express';
import { detectFraud, createFingerprint } from '../lib/fraudDetection';

const router = Router();

interface BrowserFingerprint {
  userAgent: string;
  screen: { width: number; height: number };
  timezone: string;
  language: string;
  platform: string;
  plugins: string[];
}

interface BehaviorPattern {
  mouseMovements: { x: number; y: number; timestamp: number }[];
  keystrokeTimings: number[];
  scrollBehavior: {
    totalScrolls: number;
    avgScrollDistance: number;
    scrollSpeed: number;
  };
  clickPattern: {
    totalClicks: number;
    avgTimeBetweenClicks: number;
  };
}

interface SessionMetrics {
  ipAddress: string;
  ipChange: boolean;
  deviceChange: boolean;
  locationChange: boolean;
  concurrentSessions: number;
  sessionStartTime: number;
}

interface FraudDetectionRequest {
  fingerprint: BrowserFingerprint;
  behavior: BehaviorPattern;
  session: SessionMetrics;
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

    const result = await detectFraud(
      fingerprint,
      body.behavior || {
        mouseMovements: [],
        keystrokeTimings: [],
        scrollBehavior: { totalScrolls: 0, avgScrollDistance: 0, scrollSpeed: 0 },
        clickPattern: { totalClicks: 0, avgTimeBetweenClicks: 0 }
      },
      body.session,
      []
    );

    res.json(result);
  } catch (error) {
    console.error('Error in fraud detection:', error);
    res.status(500).json({ error: 'Failed to analyze fraud risk' });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const mockResult = {
      sessionId,
      riskScore: 15,
      flags: [],
      recommendations: ['Session appears normal'],
      isTrusted: true,
      lastChecked: new Date().toISOString()
    };

    res.json(mockResult);
  } catch (error) {
    console.error('Error fetching session analysis:', error);
    res.status(500).json({ error: 'Failed to fetch session analysis' });
  }
});

export default router;