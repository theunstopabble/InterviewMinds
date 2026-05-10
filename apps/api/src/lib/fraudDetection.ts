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
  riskScore: number; // 0-100
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

function generateCanvasFingerprint(): string {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return 'unknown';
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';
  
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('InterviewMinds', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('FraudCheck', 4, 17);
  
  return canvas.toDataURL();
}

function generateWebGLFingerprint(): string {
  if (typeof document === 'undefined') return 'unknown';
  
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
  if (!gl) return 'unknown';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as unknown;
  if (!debugInfo) return 'unknown';
  
  const renderer = gl.getParameter((debugInfo as { UNMASKED_RENDERER_WEBGL: number }).UNMASKED_RENDERER_WEBGL);
  const vendor = gl.getParameter((debugInfo as { UNMASKED_VENDOR_WEBGL: number }).UNMASKED_VENDOR_WEBGL);
  
  return `${vendor}|${renderer}`;
}

export function analyzeBrowserFingerprint(fingerprint: BrowserFingerprint): FraudFlag[] {
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

export function analyzeBehaviorPattern(behavior: BehaviorPattern): FraudFlag[] {
  const flags: FraudFlag[] = [];

  if (behavior.mouseMovements.length > 0) {
    const movements = behavior.mouseMovements;
    let perfectStraightLines = 0;
    
    for (let i = 1; i < movements.length; i++) {
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

  if (behavior.clickPattern.avgTimeBetweenClicks < 100) {
    flags.push({
      type: 'bot_detection',
      severity: 'medium',
      description: 'Suspicious click pattern',
      evidence: `Avg time between clicks: ${behavior.clickPattern.avgTimeBetweenClicks}ms`
    });
  }

  return flags;
}

export function analyzeSessionMetrics(metrics: SessionMetrics, historicalSessions: SessionMetrics[]): FraudFlag[] {
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

  return flags;
}

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

export async function detectFraud(
  fingerprint: BrowserFingerprint,
  behavior: BehaviorPattern,
  sessionMetrics: SessionMetrics,
  historicalSessions: SessionMetrics[] = []
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

  return {
    riskScore,
    flags: allFlags,
    recommendations,
    isTrusted: riskScore < 30
  };
}

export function createFingerprint(userAgent: string, screen: { width: number; height: number }, timezone: string, language: string, platform: string, plugins: string[]): BrowserFingerprint {
  return {
    userAgent,
    screen,
    timezone,
    language,
    platform,
    plugins,
    canvasFingerprint: generateCanvasFingerprint(),
    webglFingerprint: generateWebGLFingerprint()
  };
}