import { logger } from "./logger";
import type { Server as SocketServer } from "socket.io";

export interface VideoSession {
  sessionId: string;
  roomId: string;
  participants: Map<string, {
    id: string;
    name: string;
    streamId?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    role: "host" | "participant";
  }>;
  startedAt: number;
  recording: boolean;
  maxParticipants: number;
}

export interface WebRTCSignal {
  from: string;
  to: string;
  type: "offer" | "answer" | "ice-candidate";
  payload: unknown;
}

const videoSessions = new Map<string, VideoSession>();
let ioInstance: SocketServer | null = null;

export function setVideoCallIO(io: SocketServer): void {
  ioInstance = io;
}

function broadcastToRoom(roomId: string, event: string, payload: unknown, excludeUserId?: string): void {
  if (!ioInstance) return;
  if (excludeUserId) {
    ioInstance.to(roomId).except(excludeUserId).emit(event, payload);
  } else {
    ioInstance.to(roomId).emit(event, payload);
  }
}

export function createVideoSession(
  roomId: string,
  hostId: string,
  hostName: string,
  maxParticipants: number = 4
): string {
  const sessionId = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const session: VideoSession = {
    sessionId,
    roomId,
    participants: new Map([[hostId, {
      id: hostId,
      name: hostName,
      audioEnabled: true,
      videoEnabled: true,
      role: "host",
    }]]),
    startedAt: Date.now(),
    recording: false,
    maxParticipants,
  };

  videoSessions.set(sessionId, session);
  logger.info({ sessionId, roomId, hostId }, "Video session created");
  broadcastToRoom(roomId, "video:session-created", { sessionId, hostId, maxParticipants });

  return sessionId;
}

export function joinVideoSession(
  sessionId: string,
  userId: string,
  userName: string
): VideoSession["participants"] | null {
  const session = videoSessions.get(sessionId);
  if (!session) return null;

  if (session.participants.size >= session.maxParticipants) {
    throw new Error("Session is full");
  }

  session.participants.set(userId, {
    id: userId,
    name: userName,
    audioEnabled: true,
    videoEnabled: true,
    role: "participant",
  });

  logger.info({ sessionId, userId, participants: session.participants.size }, "User joined video");
  broadcastToRoom(session.roomId, "video:user-joined", { sessionId, userId, userName, participants: Array.from(session.participants.values()) }, userId);

  return session.participants;
}

export function leaveVideoSession(sessionId: string, userId: string): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  const wasParticipant = session.participants.has(userId);
  session.participants.delete(userId);
  broadcastToRoom(session.roomId, "video:user-left", { sessionId, userId, participants: Array.from(session.participants.values()) });

  if (session.participants.size === 0) {
    videoSessions.delete(sessionId);
    logger.info({ sessionId }, "Video session ended");
  }

  return wasParticipant;
}

export function toggleAudio(sessionId: string, userId: string, enabled: boolean): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  const participant = session.participants.get(userId);
  if (!participant) return false;

  participant.audioEnabled = enabled;
  broadcastToRoom(session.roomId, "video:audio-toggle", { sessionId, userId, enabled });
  return true;
}

export function toggleVideo(sessionId: string, userId: string, enabled: boolean): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  const participant = session.participants.get(userId);
  if (!participant) return false;

  participant.videoEnabled = enabled;
  broadcastToRoom(session.roomId, "video:video-toggle", { sessionId, userId, enabled });
  return true;
}

export function startRecording(sessionId: string): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  session.recording = true;
  logger.info({ sessionId }, "Recording started");
  broadcastToRoom(session.roomId, "video:recording-started", { sessionId });
  return true;
}

export function stopRecording(sessionId: string): string | null {
  const session = videoSessions.get(sessionId);
  if (!session || !session.recording) return null;

  session.recording = false;

  const recordingId = `rec_${Date.now()}_${sessionId}`;
  logger.info({ sessionId, recordingId }, "Recording stopped");
  broadcastToRoom(session.roomId, "video:recording-stopped", { sessionId, recordingId });

  return recordingId;
}

export function relayWebRTCSignal(sessionId: string, signal: WebRTCSignal): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;
  broadcastToRoom(session.roomId, "video:webrtc-signal", { sessionId, signal }, signal.from);
  return true;
}

export function getParticipants(sessionId: string): VideoSession["participants"] | null {
  const session = videoSessions.get(sessionId);
  if (!session) return null;

  return session.participants;
}

export function getSessionInfo(sessionId: string): {
  sessionId: string;
  roomId: string;
  participantCount: number;
  recording: boolean;
  duration: number;
} | null {
  const session = videoSessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    roomId: session.roomId,
    participantCount: session.participants.size,
    recording: session.recording,
    duration: Date.now() - session.startedAt,
  };
}

export function isSessionFull(sessionId: string): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  return session.participants.size >= session.maxParticipants;
}