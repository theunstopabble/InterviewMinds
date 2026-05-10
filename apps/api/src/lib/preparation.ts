import { v4 as uuidv4 } from 'uuid';

export interface SystemCheckResult {
  camera: boolean;
  cameraName?: string;
  microphone: boolean;
  microphoneName?: string;
  speaker: boolean;
  internetSpeed: number;
  browser: string;
  os: string;
  screenResolution: string;
  checkPassed: boolean;
  warnings: string[];
}

export interface PreparationSession {
  id: string;
  userId: string;
  role: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  systemCheck: SystemCheckResult | null;
  sampleQuestions: PreparationQuestion[];
  currentQuestionIndex: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface PreparationQuestion {
  id: string;
  question: string;
  type: 'behavioral' | 'technical' | 'coding';
  difficulty: 'easy' | 'medium' | 'hard';
  sampleAnswer?: string;
  tips?: string[];
}

export interface BreakTimer {
  interviewId: string;
  totalDuration: number;
  breakDuration: number;
  breaksTaken: number;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

class PreparationService {
  private sessions: Map<string, PreparationSession> = new Map();
  private breakTimers: Map<string, BreakTimer> = new Map();

  private defaultSampleQuestions: PreparationQuestion[] = [
    {
      id: 'sample-1',
      question: 'Tell me about yourself and why you are interested in this role.',
      type: 'behavioral',
      difficulty: 'easy',
      sampleAnswer: 'Start with current role, highlight relevant experience, end with why this role interests you. Keep it under 2 minutes.',
      tips: ['Keep it concise', 'Focus on relevant experience', 'Show enthusiasm'],
    },
    {
      id: 'sample-2',
      question: 'Describe a challenging project you worked on and how you overcame the obstacle.',
      type: 'behavioral',
      difficulty: 'medium',
      sampleAnswer: 'Use STAR method: Situation, Task, Action, Result. Focus on your specific contribution.',
      tips: ['Use STAR method', 'Quantify results', 'Show problem-solving'],
    },
    {
      id: 'sample-3',
      question: 'What are your strengths and weaknesses?',
      type: 'behavioral',
      difficulty: 'easy',
      sampleAnswer: 'Pick real strengths relevant to the job. For weaknesses, show how you are working on them.',
      tips: ['Be honest', 'Show self-awareness', 'Focus on growth'],
    },
  ];

  async checkSystem(): Promise<SystemCheckResult> {
    const result: SystemCheckResult = {
      camera: false,
      microphone: false,
      speaker: false,
      internetSpeed: 0,
      browser: '',
      os: '',
      screenResolution: '',
      checkPassed: false,
      warnings: [],
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      result.camera = true;
      result.microphone = true;
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      
      if (videoDevices.length > 0) {
        result.cameraName = videoDevices[0].label;
      }
      if (audioDevices.length > 0) {
        result.microphoneName = audioDevices[0].label;
      }

      stream.getTracks().forEach(track => track.stop());

      const audioElement = new Audio();
      await audioElement.play().catch(() => {});
      result.speaker = true;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        result.warnings.push('Camera/Microphone permission denied');
      } else if (error.name === 'NotFoundError') {
        result.warnings.push('No camera or microphone found');
      }
    }

    result.browser = navigator.userAgent.includes('Chrome') ? 'Chrome' :
      navigator.userAgent.includes('Firefox') ? 'Firefox' :
      navigator.userAgent.includes('Safari') ? 'Safari' : 'Other';
    result.os = navigator.platform;
    result.screenResolution = `${window.screen.width}x${window.screen.height}`;

    result.internetSpeed = await this.measureInternetSpeed();
    if (result.internetSpeed < 5) {
      result.warnings.push('Internet speed is slow (< 5 Mbps)');
    }

    result.checkPassed = result.camera && result.microphone && result.internetSpeed >= 5;

    return result;
  }

  private async measureInternetSpeed(): Promise<number> {
    try {
      const start = Date.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-cache' });
      const end = Date.now();
      const latency = end - start;
      const estimatedSpeed = Math.max(1, 100 - latency / 10);
      return estimatedSpeed;
    } catch {
      return 10;
    }
  }

  startPreparation(userId: string, role: string): PreparationSession {
    const session: PreparationSession = {
      id: uuidv4(),
      userId,
      role,
      status: 'not_started',
      systemCheck: null,
      sampleQuestions: [...this.defaultSampleQuestions],
      currentQuestionIndex: 0,
      startedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async runSystemCheck(sessionId: string): Promise<SystemCheckResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const result = await this.checkSystem();
    session.systemCheck = result;
    session.status = result.checkPassed ? 'in_progress' : 'failed';

    this.sessions.set(sessionId, session);
    return result;
  }

  getSession(sessionId: string): PreparationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getSessionByUser(userId: string): PreparationSession | null {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        return session;
      }
    }
    return null;
  }

  nextQuestion(sessionId: string): PreparationQuestion | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.currentQuestionIndex < session.sampleQuestions.length - 1) {
      session.currentQuestionIndex++;
      this.sessions.set(sessionId, session);
      return session.sampleQuestions[session.currentQuestionIndex];
    }
    return null;
  }

  completeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'completed';
    session.completedAt = new Date();
    this.sessions.set(sessionId, session);
    return true;
  }

  startBreakTimer(interviewId: string, totalDuration: number, breakDuration: number): BreakTimer {
    const timer: BreakTimer = {
      interviewId,
      totalDuration,
      breakDuration,
      breaksTaken: 0,
      startTime: new Date(),
      isActive: true,
    };

    this.breakTimers.set(interviewId, timer);
    return timer;
  }

  takeBreak(interviewId: string): { breakEndsAt: Date; breaksRemaining: number } | null {
    const timer = this.breakTimers.get(interviewId);
    if (!timer || !timer.isActive) return null;

    const breakEndsAt = new Date(Date.now() + timer.breakDuration * 60 * 1000);
    timer.breaksTaken++;
    
    return {
      breakEndsAt,
      breaksRemaining: Math.max(0, 3 - timer.breaksTaken),
    };
  }

  endBreakTimer(interviewId: string): { totalBreaks: number; totalBreakTime: number } | null {
    const timer = this.breakTimers.get(interviewId);
    if (!timer) return null;

    timer.isActive = false;
    timer.endTime = new Date();

    const totalBreakTime = timer.breaksTaken * timer.breakDuration;

    return {
      totalBreaks: timer.breaksTaken,
      totalBreakTime,
    };
  }

  getBreakTimer(interviewId: string): BreakTimer | null {
    return this.breakTimers.get(interviewId) || null;
  }
}

export const preparationService = new PreparationService();
export default preparationService;