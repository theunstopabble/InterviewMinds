import { logger } from './logger';
import { FraudDetectionModel } from '../models/FraudDetection';

interface BrowserFingerprint {
  userAgent: string;
  screen: { width: number; height: number };
  timezone: string;
  language: string;
  platform: string;
  plugins: string[];
  canvasFingerprint?: string;
  webglFingerprint?: string;
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

interface FraudDetectionResult {
  riskScore: number;
  flags: FraudFlag[];
  recommendations: string[];
  isTrusted: boolean;
}

interface FraudFlag {
  type: FraudFlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
}

type FraudFlagType = 
  | 'headless_browser'
  | 'virtual_machine'
  | 'screen_share'
  | 'multiple_accounts'
  | 'bot_detection'
  | 'ip_anomaly'
  | 'device_anomaly'
  | 'location_anomaly'
  | 'behavior_anomaly'
  | 'concurrent_sessions'
  | 'session_replay';

/* ------------------------------------------------------------------ */
/*  Browser Fingerprint Analysis                                       */
/* ------------------------------------------------------------------ */

function analyzeBrowserFingerprint(fingerprint: BrowserFingerprint): FraudFlag[] {
  const flags: FraudFlag[] = [];

  const headlessIndicators = [
    'HeadlessChrome',
    'PhantomJS',
    'Selenium',
    'Automation',
    'electron'
  ];
  
  const userAgentLower = fingerprint.userAgent.toLowerCase();
  if (headlessIndicators.some(ind => userAgentLower.includes(ind.toLowerCase()))) {
    flags.push({
      type: 'headless_browser',
      severity: 'high',
      description: 'Headless browser detected',
      evidence: `User-Agent: ${fingerprint.userAgent}`
    });
  }

  const vmIndicators = ['vmware', 'virtualbox', 'parallels', 'qemu', 'kvm'];
  if (vmIndicators.some(ind => userAgentLower.includes(ind))) {
    flags.push({
      type: 'virtual_machine',
      severity: 'medium',
      description: 'Virtual machine detected',
      evidence: `User-Agent contains VM indicators`
    });
  }

  if (fingerprint.plugins.length === 0 && fingerprint.screen.width > 1920) {
    flags.push({
      type: 'headless_browser',
      severity: 'medium',
      description: 'Suspicious browser configuration',
      evidence: 'No plugins and unusual screen resolution'
    });
  }

  if (!fingerprint.plugins.includes('Chrome PDF Plugin') &&
      !fingerprint.plugins.includes('PDF Viewer') &&
      fingerprint.plugins.length < 2) {
    flags.push({
      type: 'headless_browser',
      severity: 'low',
      description: 'Minimal browser plugins detected',
      evidence: `Plugins count: ${fingerprint.plugins.length}`
    });
  }

  if (fingerprint.canvasFingerprint && fingerprint.canvasFingerprint.includes('InterviewMinds')) {
    flags.push({
      type: 'bot_detection',
      severity: 'low',
      description: 'Canvas fingerprint test triggered',
      evidence: 'Canvas reading detected'
    });
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Behavioral Analysis                                                */
/* ------------------------------------------------------------------ */

function analyzeBehaviorPattern(behavior: BehaviorPattern): FraudFlag[] {
  const flags: FraudFlag[] = [];

  if (behavior.mouseMovements.length > 0) {
    const movements = behavior.mouseMovements;
    let perfectStraightLines = 0;
    
    for (let i = 1; i < movements.length - 1; i++) {
      const dx = movements[i].x - movements[i-1].x;
      const dy = movements[i].y - movements[i-1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 5) {
        const angle = Math.atan2(dy, dx);
        const nextDx = movements[i+1]?.x - movements[i].x || 0;
        const nextDy = movements[i+1]?.y - movements[i].y || 0;
        const nextAngle = Math.atan2(nextDy, nextDx);
        if (Math.abs(angle - nextAngle) < 0.1) perfectStraightLines++;
      }
    }
    
    if (perfectStraightLines > movements.length * 0.3) {
      flags.push({
        type: 'bot_detection',
        severity: 'high',
        description: 'Suspicious mouse movement pattern',
        evidence: `${perfectStraightLines} straight-line movements detected`
      });
    }
  }

  if (behavior.keystrokeTimings.length > 0) {
    const timings = behavior.keystrokeTimings;
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    const variance = timings.reduce((acc, t) => acc + Math.pow(t - avgTiming, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev < 10) {
      flags.push({
        type: 'bot_detection',
        severity: 'medium',
        description: 'Abnormally consistent keystroke timing',
        evidence: `StdDev: ${stdDev.toFixed(2)}ms`
      });
    }
    
    if (avgTiming < 30) {
      flags.push({
        type: 'bot_detection',
        severity: 'high',
        description: 'Unnaturally fast typing detected',
        evidence: `Average timing: ${avgTiming.toFixed(2)}ms`
      });
    }
  }

  if (behavior.scrollBehavior.avgScrollDistance < 10 && behavior.scrollBehavior.totalScrolls > 5) {
    flags.push({
      type: 'behavior_anomaly',
      severity: 'low',
      description: 'Unusual scroll behavior',
      evidence: `Avg scroll: ${behavior.scrollBehavior.avgScrollDistance.toFixed(2)}px`
    });
  }

  if (behavior.clickPattern.avgTimeBetweenClicks < 100 && behavior.clickPattern.totalClicks > 3) {
    flags.push({
      type: 'bot_detection',
      severity: 'medium',
      description: 'Suspicious click pattern',
      evidence: `Avg time between clicks: ${behavior.clickPattern.avgTimeBetweenClicks}ms`
    });
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Session Metrics Analysis                                           */
/* ------------------------------------------------------------------ */

function analyzeSessionMetrics(metrics: SessionMetrics, historicalSessions: SessionMetrics[]): FraudFlag[] {
  const flags: FraudFlag[] = [];

  if (metrics.ipChange) {
    const previousIPs = historicalSessions.map(s => s.ipAddress);
    flags.push({
      type: 'ip_anomaly',
      severity: 'medium',
      description: 'IP address changed during session',
      evidence: `Previous IPs: ${previousIPs.join(', ')}`
    });
  }

  if (metrics.concurrentSessions > 1) {
    flags.push({
      type: 'concurrent_sessions',
      severity: 'high',
      description: 'Multiple concurrent sessions detected',
      evidence: `${metrics.concurrentSessions} active sessions`
    });
  }

  if (metrics.deviceChange) {
    flags.push({
      type: 'device_anomaly',
      severity: 'high',
      description: 'Device changed during session',
      evidence: 'Device fingerprint mismatch'
    });
  }

  if (metrics.locationChange) {
    flags.push({
      type: 'location_anomaly',
      severity: 'medium',
      description: 'Location changed significantly',
      evidence: 'Geo-location inconsistency detected'
    });
  }

  const sessionDuration = Date.now() - metrics.sessionStartTime;
  if (sessionDuration < 60000 && metrics.concurrentSessions > 0) {
    flags.push({
      type: 'session_replay',
      severity: 'low',
      description: 'Very short session with concurrent activity',
      evidence: `Session duration: ${sessionDuration}ms`
    });
  }

  return flags;
}

/* ------------------------------------------------------------------ */
/*  Risk Scoring & Recommendations                                     */
/* ------------------------------------------------------------------ */

function calculateRiskScore(flags: FraudFlag[]): number {
  const severityWeights: Record<string, number> = {
    low: 10,
    medium: 25,
    high: 50,
    critical: 100
  };

  let totalScore = 0;
  flags.forEach(flag => {
    totalScore += severityWeights[flag.severity] || 10;
  });

  const countMultiplier = Math.min(1 + (flags.length * 0.1), 2);
  
  return Math.min(100, Math.round(totalScore * countMultiplier));
}

function generateRecommendations(flags: FraudFlag[], riskScore: number): string[] {
  const recommendations: string[] = [];

  if (riskScore >= 80) {
    recommendations.push('Consider terminating session and requiring re-verification');
    recommendations.push('Flag account for manual review');
  } else if (riskScore >= 50) {
    recommendations.push('Enable enhanced monitoring for this session');
    recommendations.push('Consider requiring additional verification');
  }

  const criticalTypes = flags.filter(f => f.type === 'headless_browser' || f.type === 'virtual_machine');
  if (criticalTypes.length > 0) {
    recommendations.push('Block automated/scripted access');
  }

  const botFlags = flags.filter(f => f.type === 'bot_detection');
  if (botFlags.length > 0) {
    recommendations.push('Implement CAPTCHA challenge');
  }

  if (flags.some(f => f.type === 'concurrent_sessions')) {
    recommendations.push('Terminate duplicate sessions');
  }

  return recommendations;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function detectFraud(
  fingerprint: BrowserFingerprint,
  behavior: BehaviorPattern,
  sessionMetrics: SessionMetrics,
  historicalSessions: SessionMetrics[] = [],
  sessionId?: string,
  userId?: string
): Promise<FraudDetectionResult> {
  const allFlags: FraudFlag[] = [];

  const fingerprintFlags = analyzeBrowserFingerprint(fingerprint);
  allFlags.push(...fingerprintFlags);

  const behaviorFlags = analyzeBehaviorPattern(behavior);
  allFlags.push(...behaviorFlags);

  const sessionFlags = analyzeSessionMetrics(sessionMetrics, historicalSessions);
  allFlags.push(...sessionFlags);

  const riskScore = calculateRiskScore(allFlags);
  const recommendations = generateRecommendations(allFlags, riskScore);

  const result: FraudDetectionResult = {
    riskScore,
    flags: allFlags,
    recommendations,
    isTrusted: riskScore < 30
  };

  try {
    await FraudDetectionModel.create({
      sessionId: sessionId || crypto.randomUUID(),
      userId: userId || null,
      riskScore,
      flags: allFlags,
      recommendations,
      isTrusted: riskScore < 30,
      fingerprint,
      behavior,
      sessionMetrics,
    });
    logger.info({ riskScore, flagCount: allFlags.length }, 'Fraud detection result persisted');
  } catch (error) {
    logger.error({ err: error }, 'Failed to persist fraud detection result');
  }

  return result;
}

export function createFingerprint(userAgent: string, screen: { width: number; height: number }, timezone: string, language: string, platform: string, plugins: string[]): BrowserFingerprint {
  return {
    userAgent,
    screen,
    timezone,
    language,
    platform,
    plugins,
  };
}

export async function getSessionAnalysis(sessionId: string): Promise<FraudDetectionResult | null> {
  try {
    const doc = await FraudDetectionModel.findOne({ sessionId })
      .sort({ createdAt: -1 })
      .lean();
    if (!doc) return null;
    return {
      riskScore: doc.riskScore,
      flags: doc.flags.map(f => ({
        type: f.type as FraudFlagType,
        severity: f.severity as 'low' | 'medium' | 'high' | 'critical',
        description: f.description,
        evidence: f.evidence,
      })),
      recommendations: doc.recommendations,
      isTrusted: doc.isTrusted,
    };
  } catch (error) {
    logger.error({ err: error, sessionId }, 'Failed to fetch session analysis from MongoDB');
    return null;
  }
}
