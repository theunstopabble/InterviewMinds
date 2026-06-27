import { WaitingRoomSessionModel } from '../models/WaitingRoom';
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

function toEntry(raw: Record<string, unknown>): WaitingRoomEntry {
  const tcd = raw.techCheckDetails as Record<string, unknown> | null;
  return {
    id: raw.id as string,
    candidateId: raw.candidateId as string,
    candidateName: raw.candidateName as string,
    candidateEmail: raw.candidateEmail as string,
    interviewId: raw.interviewId as string,
    role: raw.role as string,
    scheduledTime: raw.scheduledTime as Date,
    status: raw.status as WaitingRoomStatus,
    position: raw.position as number,
    estimatedWaitTime: raw.estimatedWaitTime as number,
    techCheckPassed: raw.techCheckPassed as boolean,
    techCheckDetails: tcd
      ? {
          cameraWorking: tcd.cameraWorking as boolean,
          microphoneWorking: tcd.microphoneWorking as boolean,
          speakerWorking: tcd.speakerWorking as boolean,
          internetSpeed: tcd.internetSpeed as number,
          browserSupported: tcd.browserSupported as boolean,
          screenShareSupported: tcd.screenShareSupported as boolean,
          checkedAt: tcd.checkedAt as Date,
        }
      : null,
    joinedAt: raw.joinedAt as Date,
    readyAt: raw.readyAt as Date | undefined,
    interviewStartedAt: raw.interviewStartedAt as Date | undefined,
  };
}

function toSession(raw: Record<string, unknown>): WaitingRoomSession {
  return {
    interviewId: raw.interviewId as string,
    entries: ((raw.entries as Record<string, unknown>[]) || []).map(toEntry),
    maxCapacity: raw.maxCapacity as number,
    createdAt: raw.createdAt as Date,
  };
}

class WaitingRoomService {
  async createSession(interviewId: string, maxCapacity: number = 10): Promise<WaitingRoomSession> {
    const doc = await WaitingRoomSessionModel.create({
      interviewId,
      entries: [],
      maxCapacity,
    });
    return toSession(doc.toObject() as unknown as Record<string, unknown>);
  }

  async addToQueue(
    candidateId: string,
    candidateName: string,
    candidateEmail: string,
    interviewId: string,
    role: string,
    scheduledTime: Date
  ): Promise<WaitingRoomEntry | null> {
    const doc = await WaitingRoomSessionModel.findOne({ interviewId });
    if (!doc) {
      return null;
    }

    if (doc.entries.length >= doc.maxCapacity) {
      return null;
    }

    const activeCount = doc.entries.filter(
      e => e.status !== 'interview_started' && e.status !== 'cancelled'
    ).length;
    const position = activeCount + 1;

    const entry = {
      id: uuidv4(),
      candidateId,
      candidateName,
      candidateEmail,
      interviewId,
      role,
      scheduledTime,
      status: 'queued' as const,
      position,
      estimatedWaitTime: position * 10,
      techCheckPassed: false,
      techCheckDetails: null,
      joinedAt: new Date(),
    };

    doc.entries.push(entry as unknown as typeof doc.entries[0]);
    await doc.save();

    return toEntry(entry as unknown as Record<string, unknown>);
  }

  runTechCheck(_entryId: string): TechCheckDetails {
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

  async updateEntryTechCheck(entryId: string, details: TechCheckDetails): Promise<WaitingRoomEntry | null> {
    const doc = await WaitingRoomSessionModel.findOne({ 'entries.id': entryId });
    if (!doc) return null;

    const entry = doc.entries.find(e => e.id === entryId);
    if (!entry) return null;

    entry.techCheckDetails = details as typeof entry.techCheckDetails;
    entry.techCheckPassed = details.cameraWorking && details.microphoneWorking && details.internetSpeed >= 5;
    entry.status = entry.techCheckPassed ? 'tech_check' : 'queued';
    await doc.save();

    return toEntry(entry as unknown as Record<string, unknown>);
  }

  async markReady(entryId: string): Promise<WaitingRoomEntry | null> {
    const doc = await WaitingRoomSessionModel.findOne({ 'entries.id': entryId });
    if (!doc) return null;

    const entry = doc.entries.find(e => e.id === entryId);
    if (!entry || !entry.techCheckPassed) return null;

    entry.status = 'ready';
    entry.readyAt = new Date();
    await doc.save();

    return toEntry(entry as unknown as Record<string, unknown>);
  }

  async startInterview(entryId: string): Promise<WaitingRoomEntry | null> {
    const doc = await WaitingRoomSessionModel.findOne({ 'entries.id': entryId });
    if (!doc) return null;

    const entryIndex = doc.entries.findIndex(e => e.id === entryId && e.status === 'ready');
    if (entryIndex === -1) return null;

    const entry = doc.entries[entryIndex];
    entry.status = 'interview_started';
    entry.interviewStartedAt = new Date();

    let pos = 1;
    doc.entries.forEach(e => {
      if (e.id !== entryId && e.status !== 'interview_started' && e.status !== 'cancelled') {
        e.position = pos;
        e.estimatedWaitTime = pos * 10;
        pos++;
      }
    });

    await doc.save();
    return toEntry(entry as unknown as Record<string, unknown>);
  }

  async getQueue(interviewId: string): Promise<WaitingRoomEntry[]> {
    const doc = await WaitingRoomSessionModel.findOne({ interviewId }).lean();
    if (!doc) return [];
    return (doc.entries as unknown as Record<string, unknown>[])
      .filter(e => {
        const s = e.status as string;
        return s !== 'interview_started' && s !== 'cancelled';
      })
      .map(toEntry);
  }

  async getNextInLine(interviewId: string): Promise<WaitingRoomEntry | null> {
    const doc = await WaitingRoomSessionModel.findOne({ interviewId }).lean();
    if (!doc) return null;

    const active = (doc.entries as unknown as Record<string, unknown>[]).filter(e => {
      const s = e.status as string;
      return s !== 'interview_started' && s !== 'cancelled';
    });
    const found = active.find(e => e.status === 'ready') || active.find(e => e.status === 'tech_check') || null;
    return found ? toEntry(found) : null;
  }

  async getSession(interviewId: string): Promise<WaitingRoomSession | null> {
    const doc = await WaitingRoomSessionModel.findOne({ interviewId }).lean();
    if (!doc) return null;
    return toSession(doc as unknown as Record<string, unknown>);
  }

  async removeFromQueue(entryId: string): Promise<boolean> {
    const doc = await WaitingRoomSessionModel.findOne({ 'entries.id': entryId });
    if (!doc) return false;

    const entry = doc.entries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.status = 'cancelled';

    let pos = 1;
    doc.entries.forEach(e => {
      if (e.id !== entryId && e.status !== 'interview_started' && e.status !== 'cancelled') {
        e.position = pos;
        e.estimatedWaitTime = pos * 10;
        pos++;
      }
    });

    await doc.save();
    return true;
  }

  async getQueuePosition(entryId: string): Promise<number> {
    const doc = await WaitingRoomSessionModel.findOne(
      { 'entries.id': entryId },
      { 'entries.$': 1 }
    ).lean();
    if (!doc || !doc.entries || doc.entries.length === 0) return -1;
    return (doc.entries[0] as unknown as Record<string, unknown>).position as number;
  }

  async getEstimatedWaitTime(entryId: string): Promise<number> {
    const doc = await WaitingRoomSessionModel.findOne(
      { 'entries.id': entryId },
      { 'entries.$': 1 }
    ).lean();
    if (!doc || !doc.entries || doc.entries.length === 0) return 0;
    return (doc.entries[0] as unknown as Record<string, unknown>).estimatedWaitTime as number;
  }
}

export const waitingRoomService = new WaitingRoomService();
export default waitingRoomService;
