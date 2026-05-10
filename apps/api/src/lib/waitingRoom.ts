import { v4 as uuidv4 } from 'uuid';

export type WaitingRoomStatus = 'queued' | 'in_waiting' | 'tech_check' | 'ready' | 'interview_started' | 'no_show' | 'cancelled';

export interface WaitingRoomEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewId: string;
  role: string;
  scheduledTime: Date;
  status: WaitingRoomStatus;
  position: number;
  estimatedWaitTime: number;
  techCheckPassed: boolean;
  techCheckDetails: TechCheckDetails | null;
  joinedAt: Date;
  readyAt?: Date;
  interviewStartedAt?: Date;
}

export interface TechCheckDetails {
  cameraWorking: boolean;
  microphoneWorking: boolean;
  speakerWorking: boolean;
  internetSpeed: number;
  browserSupported: boolean;
  screenShareSupported: boolean;
  checkedAt: Date;
}

export interface WaitingRoomSession {
  interviewId: string;
  entries: WaitingRoomEntry[];
  maxCapacity: number;
  createdAt: Date;
}

class WaitingRoomService {
  private sessions: Map<string, WaitingRoomSession> = new Map();
  private queue: Map<string, WaitingRoomEntry[]> = new Map();

  createSession(interviewId: string, maxCapacity: number = 10): WaitingRoomSession {
    const session: WaitingRoomSession = {
      interviewId,
      entries: [],
      maxCapacity,
      createdAt: new Date(),
    };

    this.sessions.set(interviewId, session);
    this.queue.set(interviewId, []);
    return session;
  }

  addToQueue(
    candidateId: string,
    candidateName: string,
    candidateEmail: string,
    interviewId: string,
    role: string,
    scheduledTime: Date
  ): WaitingRoomEntry | null {
    const session = this.sessions.get(interviewId);
    if (!session) {
      return null;
    }

    if (session.entries.length >= session.maxCapacity) {
      return null;
    }

    const existingQueue = this.queue.get(interviewId) || [];
    const position = existingQueue.length + 1;

    const entry: WaitingRoomEntry = {
      id: uuidv4(),
      candidateId,
      candidateName,
      candidateEmail,
      interviewId,
      role,
      scheduledTime,
      status: 'queued',
      position,
      estimatedWaitTime: position * 10,
      techCheckPassed: false,
      techCheckDetails: null,
      joinedAt: new Date(),
    };

    existingQueue.push(entry);
    this.queue.set(interviewId, existingQueue);
    session.entries.push(entry);
    this.sessions.set(interviewId, session);

    return entry;
  }

  runTechCheck(entryId: string): TechCheckDetails {
    const details: TechCheckDetails = {
      cameraWorking: false,
      microphoneWorking: false,
      speakerWorking: false,
      internetSpeed: 0,
      browserSupported: false,
      screenShareSupported: false,
      checkedAt: new Date(),
    };

    try {
      const userAgent = navigator.userAgent;
      const isChrome = userAgent.includes('Chrome');
      const isFirefox = userAgent.includes('Firefox');
      const isSafari = userAgent.includes('Safari');
      details.browserSupported = isChrome || isFirefox || isSafari;
      details.screenShareSupported = isChrome || isFirefox;
    } catch {
      details.browserSupported = false;
    }

    return details;
  }

  updateEntryTechCheck(entryId: string, details: TechCheckDetails): WaitingRoomEntry | null {
    for (const [interviewId, queue] of this.queue.entries()) {
      const entry = queue.find(e => e.id === entryId);
      if (entry) {
        entry.techCheckDetails = details;
        entry.techCheckPassed = details.cameraWorking && 
          details.microphoneWorking && 
          details.internetSpeed >= 5;
        entry.status = entry.techCheckPassed ? 'tech_check' : 'queued';
        
        this.queue.set(interviewId, queue);
        
        const session = this.sessions.get(interviewId);
        if (session) {
          const sessionEntry = session.entries.find(e => e.id === entryId);
          if (sessionEntry) {
            sessionEntry.techCheckDetails = details;
            sessionEntry.techCheckPassed = entry.techCheckPassed;
            sessionEntry.status = entry.status;
            this.sessions.set(interviewId, session);
          }
        }
        
        return entry;
      }
    }
    return null;
  }

  markReady(entryId: string): WaitingRoomEntry | null {
    for (const [interviewId, queue] of this.queue.entries()) {
      const entry = queue.find(e => e.id === entryId);
      if (entry && entry.techCheckPassed) {
        entry.status = 'ready';
        entry.readyAt = new Date();
        
        this.queue.set(interviewId, queue);
        
        const session = this.sessions.get(interviewId);
        if (session) {
          const sessionEntry = session.entries.find(e => e.id === entryId);
          if (sessionEntry) {
            sessionEntry.status = 'ready';
            sessionEntry.readyAt = new Date();
            this.sessions.set(interviewId, session);
          }
        }
        
        return entry;
      }
    }
    return null;
  }

  startInterview(entryId: string): WaitingRoomEntry | null {
    for (const [interviewId, queue] of this.queue.entries()) {
      const entryIndex = queue.findIndex(e => e.id === entryId && e.status === 'ready');
      if (entryIndex !== -1) {
        const entry = queue[entryIndex];
        entry.status = 'interview_started';
        entry.interviewStartedAt = new Date();
        
        queue.splice(entryIndex, 1);
        queue.forEach((e, idx) => {
          e.position = idx + 1;
          e.estimatedWaitTime = (e.position) * 10;
        });
        
        this.queue.set(interviewId, queue);
        
        const session = this.sessions.get(interviewId);
        if (session) {
          const sessionEntry = session.entries.find(e => e.id === entryId);
          if (sessionEntry) {
            sessionEntry.status = 'interview_started';
            sessionEntry.interviewStartedAt = new Date();
            this.sessions.set(interviewId, session);
          }
        }
        
        return entry;
      }
    }
    return null;
  }

  getQueue(interviewId: string): WaitingRoomEntry[] {
    return this.queue.get(interviewId) || [];
  }

  getNextInLine(interviewId: string): WaitingRoomEntry | null {
    const queue = this.queue.get(interviewId) || [];
    return queue.find(e => e.status === 'ready') || queue.find(e => e.status === 'tech_check') || null;
  }

  getSession(interviewId: string): WaitingRoomSession | null {
    return this.sessions.get(interviewId) || null;
  }

  removeFromQueue(entryId: string): boolean {
    for (const [interviewId, queue] of this.queue.entries()) {
      const index = queue.findIndex(e => e.id === entryId);
      if (index !== -1) {
        const entry = queue[index];
        entry.status = 'cancelled';
        
        queue.splice(index, 1);
        queue.forEach((e, idx) => {
          e.position = idx + 1;
          e.estimatedWaitTime = (e.position) * 10;
        });
        
        this.queue.set(interviewId, queue);
        return true;
      }
    }
    return false;
  }

  getQueuePosition(entryId: string): number {
    for (const queue of this.queue.values()) {
      const entry = queue.find(e => e.id === entryId);
      if (entry) {
        return entry.position;
      }
    }
    return -1;
  }

  getEstimatedWaitTime(entryId: string): number {
    for (const queue of this.queue.values()) {
      const entry = queue.find(e => e.id === entryId);
      if (entry) {
        return entry.estimatedWaitTime;
      }
    }
    return 0;
  }
}

export const waitingRoomService = new WaitingRoomService();
export default waitingRoomService;