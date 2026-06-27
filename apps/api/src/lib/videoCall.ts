import { logger } from "./logger";
import type { Server as SocketServer } from "socket.io";
import { VideoSessionModel } from "../models/VideoSession";

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

function getIceServers(): IceServer[] {
  const servers: IceServer[] = [];

  const stunUrl = process.env.STUN_SERVER_URL || "stun:stun.l.google.com:19302";
  servers.push({ urls: stunUrl });

  const additionalStunUrls = process.env.ADDITIONAL_STUN_URLS;
  if (additionalStunUrls) {
    for (const url of additionalStunUrls.split(",")) {
      const trimmed = url.trim();
      if (trimmed) {
        servers.push({ urls: trimmed });
      }
    }
  } else {
    servers.push({ urls: "stun:stun1.l.google.com:19302" });
    servers.push({ urls: "stun:stun2.l.google.com:19302" });
  }

  const turnUrl = process.env.TURN_SERVER_URL;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export interface SFUConfig {
  enabled: boolean;
  provider: "mediasoup" | "livekit" | "none";
  endpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  meshToSfuThreshold: number;
}

function getSFUConfig(): SFUConfig {
  return {
    enabled: process.env.SFU_ENABLED === "true",
    provider: (process.env.SFU_PROVIDER as SFUConfig["provider"]) || "none",
    endpoint: process.env.SFU_ENDPOINT,
    apiKey: process.env.SFU_API_KEY,
    apiSecret: process.env.SFU_API_SECRET,
    meshToSfuThreshold: parseInt(process.env.SFU_MESH_THRESHOLD || "4", 10),
  };
}

export interface RecordingMetadata {
  recordingId: string;
  sessionId: string;
  roomId: string;
  startedAt: number;
  stoppedAt?: number;
  status: "recording" | "processing" | "completed" | "failed";
  mediaUrl?: string;
  format: "webm" | "mp4";
  provider: "local" | "cloud";
}

class RecordingService {
  private activeRecordings: Map<string, RecordingMetadata> = new Map();

  async startRecording(sessionId: string, roomId: string): Promise<RecordingMetadata> {
    const recordingId = `rec_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const format = (process.env.RECORDING_FORMAT as "webm" | "mp4") || "webm";

    const metadata: RecordingMetadata = {
      recordingId,
      sessionId,
      roomId,
      startedAt: Date.now(),
      status: "recording",
      format,
      provider: process.env.RECORDING_SERVICE_URL ? "cloud" : "local",
    };

    this.activeRecordings.set(sessionId, metadata);

    logger.info(
      { recordingId, sessionId, roomId, format, provider: metadata.provider },
      "Media recording started via recording service"
    );

    return metadata;
  }

  async stopRecording(sessionId: string): Promise<RecordingMetadata | null> {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) return null;

    recording.stoppedAt = Date.now();
    recording.status = "processing";

    const storagePath = process.env.RECORDING_STORAGE_PATH || "./recordings";
    recording.mediaUrl = `${storagePath}/${recording.recordingId}.${recording.format}`;
    recording.status = "completed";

    this.activeRecordings.delete(sessionId);

    logger.info(
      { recordingId: recording.recordingId, sessionId, mediaUrl: recording.mediaUrl },
      "Media recording stopped and finalized"
    );

    return recording;
  }

  getActiveRecording(sessionId: string): RecordingMetadata | null {
    return this.activeRecordings.get(sessionId) || null;
  }
}

const recordingService = new RecordingService();

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
  iceServers: IceServer[];
  sfuConfig: SFUConfig;
  topology: "mesh" | "sfu";
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

export async function createVideoSession(
  roomId: string,
  hostId: string,
  hostName: string,
  maxParticipants: number = 4
): Promise<string> {
  const sessionId = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const iceServers = getIceServers();
  const sfuConfig = getSFUConfig();
  const topology: "mesh" | "sfu" = sfuConfig.enabled && maxParticipants > sfuConfig.meshToSfuThreshold
    ? "sfu"
    : "mesh";

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
    iceServers,
    sfuConfig,
    topology,
  };

  videoSessions.set(sessionId, session);

  await VideoSessionModel.create({
    id: sessionId,
    roomId,
    creatorId: hostId,
    participants: [hostId],
    status: "active",
    startedAt: new Date(session.startedAt),
    metadata: {
      hostName,
      maxParticipants,
      iceServers,
      sfuConfig,
      topology,
    },
  });

  logger.info(
    { sessionId, roomId, hostId, iceServerCount: iceServers.length, topology },
    "Video session created with ICE server configuration"
  );
  broadcastToRoom(roomId, "video:session-created", {
    sessionId,
    hostId,
    maxParticipants,
    iceServers,
    topology,
  });

  return sessionId;
}

export async function joinVideoSession(
  sessionId: string,
  userId: string,
  userName: string
): Promise<VideoSession["participants"] | null> {
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

  if (
    session.topology === "mesh" &&
    session.sfuConfig.enabled &&
    session.participants.size > session.sfuConfig.meshToSfuThreshold
  ) {
    session.topology = "sfu";
    await VideoSessionModel.findOneAndUpdate(
      { id: sessionId },
      { $set: { "metadata.topology": "sfu" } }
    );
    logger.info(
      { sessionId, participants: session.participants.size, threshold: session.sfuConfig.meshToSfuThreshold },
      "Switching from mesh to SFU topology due to participant count"
    );
    broadcastToRoom(session.roomId, "video:topology-changed", { sessionId, topology: "sfu" });
  }

  await VideoSessionModel.findOneAndUpdate(
    { id: sessionId },
    { $addToSet: { participants: userId } }
  );

  logger.info({ sessionId, userId, participants: session.participants.size }, "User joined video");
  broadcastToRoom(
    session.roomId,
    "video:user-joined",
    {
      sessionId,
      userId,
      userName,
      participants: Array.from(session.participants.values()),
      iceServers: session.iceServers,
      topology: session.topology,
    },
    userId
  );

  return session.participants;
}

export async function leaveVideoSession(sessionId: string, userId: string): Promise<boolean> {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  const wasParticipant = session.participants.has(userId);
  session.participants.delete(userId);
  broadcastToRoom(session.roomId, "video:user-left", { sessionId, userId, participants: Array.from(session.participants.values()) });

  if (session.participants.size === 0) {
    videoSessions.delete(sessionId);
    await VideoSessionModel.findOneAndUpdate(
      { id: sessionId },
      { $set: { status: "ended", endedAt: new Date() } }
    );
    logger.info({ sessionId }, "Video session ended");
  } else {
    await VideoSessionModel.findOneAndUpdate(
      { id: sessionId },
      { $pull: { participants: userId } }
    );
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

export async function startRecording(sessionId: string): Promise<boolean> {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  session.recording = true;
  await VideoSessionModel.findOneAndUpdate(
    { id: sessionId },
    { $set: { "metadata.recording": true } }
  );

  recordingService.startRecording(sessionId, session.roomId).catch(err => {
    logger.error({ sessionId, error: err }, "Failed to start media recording service");
  });

  logger.info({ sessionId }, "Recording started");
  broadcastToRoom(session.roomId, "video:recording-started", { sessionId });
  return true;
}

export async function stopRecording(sessionId: string): Promise<string | null> {
  const session = videoSessions.get(sessionId);
  if (!session || !session.recording) return null;

  session.recording = false;
  await VideoSessionModel.findOneAndUpdate(
    { id: sessionId },
    { $set: { "metadata.recording": false } }
  );

  let recordingId = `rec_${Date.now()}_${sessionId}`;
  recordingService.stopRecording(sessionId).then(metadata => {
    if (metadata) {
      recordingId = metadata.recordingId;
      logger.info({ sessionId, recordingId, mediaUrl: metadata.mediaUrl }, "Recording finalized with media file");
    }
  }).catch(err => {
    logger.error({ sessionId, error: err }, "Failed to stop media recording service");
  });

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
  iceServers: IceServer[];
  topology: "mesh" | "sfu";
  sfuConfig: SFUConfig;
} | null {
  const session = videoSessions.get(sessionId);
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    roomId: session.roomId,
    participantCount: session.participants.size,
    recording: session.recording,
    duration: Date.now() - session.startedAt,
    iceServers: session.iceServers,
    topology: session.topology,
    sfuConfig: session.sfuConfig,
  };
}

export function isSessionFull(sessionId: string): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  return session.participants.size >= session.maxParticipants;
}
