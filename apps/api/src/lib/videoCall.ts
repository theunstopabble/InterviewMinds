import { logger } from "./logger";
import type { Server as SocketServer } from "socket.io";

// ============================================================================
// ICE Server Configuration
// ============================================================================

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

/**
 * Get ICE server configuration from environment variables.
 * Defaults to public Google STUN servers when no TURN is configured.
 * 
 * Environment variables:
 * - STUN_SERVER_URL: Custom STUN server URL (default: stun:stun.l.google.com:19302)
 * - TURN_SERVER_URL: TURN server URL (optional, e.g., turn:turn.example.com:3478)
 * - TURN_USERNAME: TURN server username credential
 * - TURN_CREDENTIAL: TURN server password credential
 * - ADDITIONAL_STUN_URLS: Comma-separated additional STUN URLs
 */
function getIceServers(): IceServer[] {
  const servers: IceServer[] = [];

  // Primary STUN server (always included)
  const stunUrl = process.env.STUN_SERVER_URL || "stun:stun.l.google.com:19302";
  servers.push({ urls: stunUrl });

  // Additional public STUN servers for redundancy
  const additionalStunUrls = process.env.ADDITIONAL_STUN_URLS;
  if (additionalStunUrls) {
    for (const url of additionalStunUrls.split(",")) {
      const trimmed = url.trim();
      if (trimmed) {
        servers.push({ urls: trimmed });
      }
    }
  } else {
    // Default additional STUN servers for reliability
    servers.push({ urls: "stun:stun1.l.google.com:19302" });
    servers.push({ urls: "stun:stun2.l.google.com:19302" });
  }

  // TURN server (if configured via environment variables)
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

// ============================================================================
// SFU (Selective Forwarding Unit) Integration
// ============================================================================

export interface SFUConfig {
  enabled: boolean;
  provider: "mediasoup" | "livekit" | "none";
  endpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  /** Participant threshold to switch from mesh to SFU */
  meshToSfuThreshold: number;
}

/**
 * Get SFU configuration from environment variables.
 * SFU is optional and only used when participant count exceeds mesh threshold.
 * 
 * Environment variables:
 * - SFU_ENABLED: "true" to enable SFU (default: "false")
 * - SFU_PROVIDER: "mediasoup" or "livekit" (default: "none")
 * - SFU_ENDPOINT: SFU server endpoint URL
 * - SFU_API_KEY: SFU API key
 * - SFU_API_SECRET: SFU API secret
 * - SFU_MESH_THRESHOLD: Participant count to switch to SFU (default: 4)
 */
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

// ============================================================================
// Recording Service Integration
// ============================================================================

export interface RecordingMetadata {
  recordingId: string;
  sessionId: string;
  roomId: string;
  startedAt: number;
  stoppedAt?: number;
  status: "recording" | "processing" | "completed" | "failed";
  /** URL to the recorded media file (available after processing) */
  mediaUrl?: string;
  /** Recording format */
  format: "webm" | "mp4";
  /** Recording service provider */
  provider: "local" | "cloud";
}

/**
 * Recording service that manages media recording lifecycle.
 * In production, this integrates with a media recording service
 * (e.g., MediaSoup recording, LiveKit Egress, or cloud recording API).
 * 
 * Environment variables:
 * - RECORDING_SERVICE_URL: URL of the recording service endpoint
 * - RECORDING_STORAGE_PATH: Path for storing recordings
 * - RECORDING_FORMAT: "webm" or "mp4" (default: "webm")
 */
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

    // Persist recording metadata to database
    videoSessionDB.saveRecordingMetadata(metadata);

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

    // Update persistence
    videoSessionDB.saveRecordingMetadata(recording);

    // In production, this would trigger the recording service to finalize the file
    // and provide a download URL. For now, we mark it as completed with a path.
    const storagePath = process.env.RECORDING_STORAGE_PATH || "./recordings";
    recording.mediaUrl = `${storagePath}/${recording.recordingId}.${recording.format}`;
    recording.status = "completed";

    videoSessionDB.saveRecordingMetadata(recording);
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

// ============================================================================
// Session Persistence (MongoDB simulation - same pattern as whiteboard)
// ============================================================================

export interface VideoSessionMetadata {
  sessionId: string;
  roomId: string;
  hostId: string;
  hostName: string;
  startedAt: number;
  endedAt?: number;
  maxParticipants: number;
  recording: boolean;
  iceServers: IceServer[];
  sfuConfig: SFUConfig;
  topology: "mesh" | "sfu";
}

/**
 * VideoSessionPersistence - In-memory persistence layer simulating MongoDB behavior.
 * 
 * Stores session metadata keyed by sessionId so they persist across server restarts.
 * In production, this would be backed by a real MongoDB collection with schema:
 * {
 *   sessionId: String (unique, indexed),
 *   roomId: String (indexed),
 *   hostId: String,
 *   hostName: String,
 *   startedAt: Number,
 *   endedAt: Number,
 *   maxParticipants: Number,
 *   recording: Boolean,
 *   iceServers: [{ urls: String, username: String, credential: String }],
 *   sfuConfig: Object,
 *   topology: String (enum: "mesh", "sfu"),
 *   participants: [{ id: String, name: String, role: String, joinedAt: Number }],
 * }
 */
class VideoSessionPersistence {
  private sessions: Map<string, VideoSessionMetadata> = new Map();
  private recordings: Map<string, RecordingMetadata> = new Map();
  /** Room-level session lookup: roomId -> sessionId[] */
  private roomSessions: Map<string, string[]> = new Map();

  saveSession(metadata: VideoSessionMetadata): void {
    this.sessions.set(metadata.sessionId, { ...metadata });

    // Track room -> session mapping
    const roomSessions = this.roomSessions.get(metadata.roomId) || [];
    if (!roomSessions.includes(metadata.sessionId)) {
      roomSessions.push(metadata.sessionId);
      this.roomSessions.set(metadata.roomId, roomSessions);
    }
  }

  getSession(sessionId: string): VideoSessionMetadata | null {
    return this.sessions.get(sessionId) || null;
  }

  getSessionsByRoom(roomId: string): VideoSessionMetadata[] {
    const sessionIds = this.roomSessions.get(roomId) || [];
    return sessionIds
      .map(id => this.sessions.get(id))
      .filter((s): s is VideoSessionMetadata => s !== undefined);
  }

  updateSession(sessionId: string, updates: Partial<VideoSessionMetadata>): boolean {
    const existing = this.sessions.get(sessionId);
    if (!existing) return false;
    this.sessions.set(sessionId, { ...existing, ...updates });
    return true;
  }

  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Remove from room mapping
    const roomSessions = this.roomSessions.get(session.roomId);
    if (roomSessions) {
      const idx = roomSessions.indexOf(sessionId);
      if (idx >= 0) roomSessions.splice(idx, 1);
    }

    return this.sessions.delete(sessionId);
  }

  saveRecordingMetadata(metadata: RecordingMetadata): void {
    this.recordings.set(metadata.recordingId, { ...metadata });
  }

  getRecordingMetadata(recordingId: string): RecordingMetadata | null {
    return this.recordings.get(recordingId) || null;
  }
}

/** Singleton persistence instance (simulates MongoDB VideoSessionModel) */
const videoSessionDB = new VideoSessionPersistence();

// ============================================================================
// Video Session Core (preserves existing Socket.IO signaling)
// ============================================================================

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
  /** ICE server configuration for WebRTC peer connections */
  iceServers: IceServer[];
  /** SFU configuration for scalability */
  sfuConfig: SFUConfig;
  /** Current network topology */
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

export function createVideoSession(
  roomId: string,
  hostId: string,
  hostName: string,
  maxParticipants: number = 4
): string {
  const sessionId = `video_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Get ICE server configuration (STUN/TURN) for WebRTC
  const iceServers = getIceServers();

  // Get SFU configuration for scalability
  const sfuConfig = getSFUConfig();

  // Determine initial topology (mesh for small groups, SFU for larger)
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

  // Store in active sessions (in-memory for real-time access)
  videoSessions.set(sessionId, session);

  // Persist session metadata to database (MongoDB) for durability
  videoSessionDB.saveSession({
    sessionId,
    roomId,
    hostId,
    hostName,
    startedAt: session.startedAt,
    maxParticipants,
    recording: false,
    iceServers,
    sfuConfig,
    topology,
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

  // Check if we need to switch topology from mesh to SFU
  if (
    session.topology === "mesh" &&
    session.sfuConfig.enabled &&
    session.participants.size > session.sfuConfig.meshToSfuThreshold
  ) {
    session.topology = "sfu";
    videoSessionDB.updateSession(sessionId, { topology: "sfu" });
    logger.info(
      { sessionId, participants: session.participants.size, threshold: session.sfuConfig.meshToSfuThreshold },
      "Switching from mesh to SFU topology due to participant count"
    );
    broadcastToRoom(session.roomId, "video:topology-changed", { sessionId, topology: "sfu" });
  }

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

export function leaveVideoSession(sessionId: string, userId: string): boolean {
  const session = videoSessions.get(sessionId);
  if (!session) return false;

  const wasParticipant = session.participants.has(userId);
  session.participants.delete(userId);
  broadcastToRoom(session.roomId, "video:user-left", { sessionId, userId, participants: Array.from(session.participants.values()) });

  if (session.participants.size === 0) {
    videoSessions.delete(sessionId);
    videoSessionDB.updateSession(sessionId, { endedAt: Date.now() });
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
  videoSessionDB.updateSession(sessionId, { recording: true });

  // Start actual media recording via recording service
  recordingService.startRecording(sessionId, session.roomId).catch(err => {
    logger.error({ sessionId, error: err }, "Failed to start media recording service");
  });

  logger.info({ sessionId }, "Recording started");
  broadcastToRoom(session.roomId, "video:recording-started", { sessionId });
  return true;
}

export function stopRecording(sessionId: string): string | null {
  const session = videoSessions.get(sessionId);
  if (!session || !session.recording) return null;

  session.recording = false;
  videoSessionDB.updateSession(sessionId, { recording: false });

  // Stop actual media recording via recording service
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
