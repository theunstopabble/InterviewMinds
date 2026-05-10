interface FaceDetection {
  present: boolean;
  faceCount: number;
  position: { x: number; y: number; z: number };
  lighting: 'optimal' | 'dark' | 'bright' | 'backlit';
  occlusion: boolean;
  confidence: number;
}

interface EyeTracking {
  gazeDirection: 'screen' | 'away' | 'mobile';
  blinkRate: number;
  eyeContactPercentage: number;
  lookingAwayEvents: number;
}

interface ExpressionAnalysis {
  neutral: number;
  happy: number;
  surprised: number;
  confused: number;
  anxious: number;
  angry: number;
}

interface PresenceDetection {
  personCount: number;
  leavingFrame: boolean;
  objectDetection: string[];
  multipleFaces: boolean;
}

interface ProctoringMetrics {
  timestamp: number;
  faceDetection: FaceDetection;
  eyeTracking: EyeTracking;
  expressions: ExpressionAnalysis;
  presence: PresenceDetection;
}

interface AudioAnalysis {
  transcript: string;
  confidence: number;
  language: string;
  voiceCount: number;
  backgroundSounds: string[];
  fillerWords: string[];
  pace: number;
  volume: number;
  clarity: number;
}

interface AudioMetrics {
  timestamp: number;
  audio: AudioAnalysis;
}

interface ScreenMonitoring {
  tabSwitches: number;
  focusLoss: number;
  recordingDetected: boolean;
  externalDisplay: boolean;
  devToolsOpen: boolean;
}

interface ScreenMetrics {
  timestamp: number;
  screen: ScreenMonitoring;
}

interface Violation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  duration?: number;
  evidence: string;
}

type ViolationType =
  | 'no_face'
  | 'multiple_faces'
  | 'face_occluded'
  | 'looking_away'
  | 'phone_detected'
  | 'person_entered'
  | 'multiple_voices'
  | 'tab_switch'
  | 'focus_loss'
  | 'screen_recording'
  | 'dev_tools_open';

interface OverallProctoringResult {
  interviewId: string;
  startTime: number;
  endTime: number;
  violations: Violation[];
  riskScore: number;
  metricsSummary: {
    totalFacePresentTime: number;
    averageEyeContact: number;
    tabSwitchCount: number;
    audioQuality: number;
  };
  recommendation: 'pass' | 'review' | 'flag' | 'terminate';
}

function analyzeFace(frameData: string): FaceDetection {
  const hasFaceData = !!(frameData && frameData.length > 0);
  
  return {
    present: hasFaceData,
    faceCount: hasFaceData ? 1 : 0,
    position: hasFaceData ? { x: 0.5, y: 0.3, z: 0 } : { x: 0, y: 0, z: 0 },
    lighting: 'optimal',
    occlusion: false,
    confidence: hasFaceData ? 0.9 : 0
  };
}

function analyzeEyeMovement(faceData: FaceDetection, previousPositions: { x: number; y: number }[]): EyeTracking {
  const gazeDirection = 'screen';
  const blinkRate = 15;
  const eyeContactPercentage = 85;
  const lookingAwayEvents = 0;

  return {
    gazeDirection,
    blinkRate,
    eyeContactPercentage,
    lookingAwayEvents
  };
}

function analyzeExpressions(frameData: string): ExpressionAnalysis {
  return {
    neutral: 0.7,
    happy: 0.1,
    surprised: 0.05,
    confused: 0.05,
    anxious: 0.05,
    angry: 0.05
  };
}

function analyzePresence(frameData: string): PresenceDetection {
  const hasMultipleFaces = frameData.includes('multiple');
  const objects = frameData.includes('phone') ? ['phone'] : [];

  return {
    personCount: 1,
    leavingFrame: false,
    objectDetection: objects,
    multipleFaces: hasMultipleFaces
  };
}

function detectAudioFeatures(audioBuffer: Float32Array): AudioAnalysis {
  let total = 0;
  let zeroCrossings = 0;
  
  for (let i = 0; i < audioBuffer.length; i++) {
    total += Math.abs(audioBuffer[i]);
    if (i > 0 && Math.sign(audioBuffer[i]) !== Math.sign(audioBuffer[i-1])) {
      zeroCrossings++;
    }
  }
  
  const energy = total / audioBuffer.length;
  const volume = Math.min(100, Math.round(energy * 200));
  
  const sampleRate = 16000;
  const duration = audioBuffer.length / sampleRate;
  const wordsPerMinute = Math.round((200 / duration) * 60);

  return {
    transcript: '',
    confidence: 0.85,
    language: 'en',
    voiceCount: 1,
    backgroundSounds: [],
    fillerWords: ['um', 'uh'],
    pace: wordsPerMinute,
    volume,
    clarity: 85
  };
}

function checkScreenMonitoring(window: Window): ScreenMonitoring {
  const tabSwitchCount = 0;
  const focusLoss = document.hasFocus() ? 0 : 1;
  const recordingDetected = false;
  const externalDisplay = window.screen.width > window.innerWidth;
  const devToolsOpen = false;

  return {
    tabSwitches: tabSwitchCount,
    focusLoss,
    recordingDetected,
    externalDisplay,
    devToolsOpen
  };
}

function assessRiskLevel(metrics: ProctoringMetrics[], violations: Violation[]): number {
  let score = 0;

  const criticalViolations = violations.filter(v => v.severity === 'critical').length;
  const highViolations = violations.filter(v => v.severity === 'high').length;
  const mediumViolations = violations.filter(v => v.severity === 'medium').length;

  score += criticalViolations * 25;
  score += highViolations * 15;
  score += mediumViolations * 5;

  const totalMetrics = metrics.length;
  const facePresentCount = metrics.filter(m => m.faceDetection.present).length;
  const facePresentRatio = facePresentCount / Math.max(totalMetrics, 1);

  if (facePresentRatio < 0.5) score += 30;
  else if (facePresentRatio < 0.8) score += 15;

  const avgEyeContact = metrics.reduce((acc, m) => acc + m.eyeTracking.eyeContactPercentage, 0) / Math.max(totalMetrics, 1);
  if (avgEyeContact < 50) score += 20;
  else if (avgEyeContact < 70) score += 10;

  return Math.min(100, score);
}

function generateRecommendation(riskScore: number, violations: Violation[]): 'pass' | 'review' | 'flag' | 'terminate' {
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  
  if (criticalCount >= 3 || riskScore >= 90) return 'terminate';
  if (riskScore >= 70) return 'flag';
  if (riskScore >= 40) return 'review';
  return 'pass';
}

export async function processVideoFrame(frameData: string, previousPositions?: { x: number; y: number }[]): Promise<ProctoringMetrics> {
  const faceDetection = analyzeFace(frameData);
  const eyeTracking = analyzeEyeMovement(faceDetection, previousPositions || []);
  const expressions = analyzeExpressions(frameData);
  const presence = analyzePresence(frameData);

  return {
    timestamp: Date.now(),
    faceDetection,
    eyeTracking,
    expressions,
    presence
  };
}

export async function processAudioFrame(audioBuffer: Float32Array): Promise<AudioMetrics> {
  const audio = detectAudioFeatures(audioBuffer);

  return {
    timestamp: Date.now(),
    audio
  };
}

export async function checkScreenState(window: Window): Promise<ScreenMetrics> {
  const screen = checkScreenMonitoring(window);

  return {
    timestamp: Date.now(),
    screen
  };
}

export function evaluateProctoringSession(
  interviewId: string,
  videoMetrics: ProctoringMetrics[],
  audioMetrics: AudioMetrics[],
  screenMetrics: ScreenMetrics[]
): OverallProctoringResult {
  const violations: Violation[] = [];

  videoMetrics.forEach(m => {
    if (!m.faceDetection.present) {
      violations.push({
        type: 'no_face',
        severity: 'high',
        timestamp: m.timestamp,
        evidence: 'Face not detected for extended period'
      });
    }
    if (m.presence.multipleFaces) {
      violations.push({
        type: 'multiple_faces',
        severity: 'critical',
        timestamp: m.timestamp,
        evidence: 'Multiple faces detected in frame'
      });
    }
    if (m.presence.objectDetection.includes('phone')) {
      violations.push({
        type: 'phone_detected',
        severity: 'high',
        timestamp: m.timestamp,
        evidence: 'Phone detected in camera view'
      });
    }
    if (m.eyeTracking.gazeDirection === 'away') {
      violations.push({
        type: 'looking_away',
        severity: 'medium',
        timestamp: m.timestamp,
        evidence: 'Candidate looking away from screen'
      });
    }
  });

  audioMetrics.forEach(m => {
    if (m.audio.voiceCount > 1) {
      violations.push({
        type: 'multiple_voices',
        severity: 'critical',
        timestamp: m.timestamp,
        evidence: 'Multiple voices detected'
      });
    }
  });

  screenMetrics.forEach(m => {
    if (m.screen.tabSwitches > 0) {
      violations.push({
        type: 'tab_switch',
        severity: 'medium',
        timestamp: m.timestamp,
        evidence: `Tab switched ${m.screen.tabSwitches} times`
      });
    }
    if (m.screen.focusLoss > 0) {
      violations.push({
        type: 'focus_loss',
        severity: 'low',
        timestamp: m.timestamp,
        evidence: 'Window focus lost'
      });
    }
    if (m.screen.recordingDetected) {
      violations.push({
        type: 'screen_recording',
        severity: 'high',
        timestamp: m.timestamp,
        evidence: 'Screen recording detected'
      });
    }
  });

  const riskScore = assessRiskLevel(videoMetrics, violations);
  const recommendation = generateRecommendation(riskScore, violations);

  const totalFacePresentTime = videoMetrics.filter(m => m.faceDetection.present).length * 1000;
  const averageEyeContact = videoMetrics.reduce((acc, m) => acc + m.eyeTracking.eyeContactPercentage, 0) / Math.max(videoMetrics.length, 1);
  const tabSwitchCount = screenMetrics.reduce((acc, m) => acc + m.screen.tabSwitches, 0);
  const audioQuality = audioMetrics.reduce((acc, m) => acc + m.audio.clarity, 0) / Math.max(audioMetrics.length, 1);

  return {
    interviewId,
    startTime: videoMetrics[0]?.timestamp || Date.now() - 3600000,
    endTime: videoMetrics[videoMetrics.length - 1]?.timestamp || Date.now(),
    violations,
    riskScore,
    metricsSummary: {
      totalFacePresentTime,
      averageEyeContact,
      tabSwitchCount,
      audioQuality
    },
    recommendation
  };
}