import { logger } from "./logger";
import type { Server as SocketServer } from "socket.io";

export interface EditorState {
  code: string;
  cursorPosition: number;
  language: string;
  version: number;
}

export interface CollaborationSession {
  sessionId: string;
  roomId: string;
  users: Map<string, { id: string; name: string; color: string; cursor?: number }>;
  document: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, CollaborationSession>();
let ioInstance: SocketServer | null = null;

export function setCollaborationIO(io: SocketServer): void {
  ioInstance = io;
}

function broadcastToRoom(roomId: string, event: string, payload: unknown): void {
  if (ioInstance) {
    ioInstance.to(roomId).emit(event, payload);
  }
}

const USER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"
];

export function createCollabSession(roomId: string, userId: string, userName: string): string {
  const sessionId = `collab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const session: CollaborationSession = {
    sessionId,
    roomId,
    users: new Map([[userId, { id: userId, name: userName, color: USER_COLORS[0] }]]),
    document: "",
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  activeSessions.set(sessionId, session);
  logger.info({ sessionId, roomId, userId }, "Collaboration session created");
  broadcastToRoom(roomId, "collab:session-created", { sessionId, createdBy: userId });

  return sessionId;
}

export function joinCollabSession(sessionId: string, userId: string, userName: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  const colorIndex = session.users.size % USER_COLORS.length;
  const color = USER_COLORS[colorIndex];
  session.users.set(userId, { id: userId, name: userName, color });

  logger.info({ sessionId, userId, users: session.users.size }, "User joined session");
  broadcastToRoom(session.roomId, "collab:user-joined", { sessionId, userId, userName, color, users: Array.from(session.users.values()) });
  return true;
}

export function leaveCollabSession(sessionId: string, userId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.users.delete(userId);
  broadcastToRoom(session.roomId, "collab:user-left", { sessionId, userId, users: Array.from(session.users.values()) });

  if (session.users.size === 0) {
    activeSessions.delete(sessionId);
    logger.info({ sessionId }, "Session ended - no users left");
  }

  return true;
}

export function updateDocument(sessionId: string, code: string, userId?: string): string | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  session.document = code;
  broadcastToRoom(session.roomId, "collab:document-update", { sessionId, code, updatedBy: userId, version: Date.now() });
  return session.document;
}

export function getSessionUsers(sessionId: string): Array<{ id: string; name: string; color: string }> {
  const session = activeSessions.get(sessionId);
  if (!session) return [];

  return Array.from(session.users.values()).map(u => ({
    id: u.id,
    name: u.name,
    color: u.color,
  }));
}

export function getSession(sessionId: string): CollaborationSession | null {
  return activeSessions.get(sessionId) || null;
}

export function updateCursor(sessionId: string, userId: string, position: number): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  const user = session.users.get(userId);
  if (user) {
    user.cursor = position;
    broadcastToRoom(session.roomId, "collab:cursor-update", { sessionId, userId, position });
  }
  return true;
}

export function getCodeChanges(sessionId: string, fromVersion: number): {
  code: string;
  version: number;
} | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  
  return {
    code: session.document,
    version: session.users.size,
  };
}

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  
  activeSessions.forEach((session, id) => {
    if (session.expiresAt < now) {
      activeSessions.delete(id);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    logger.info({ cleaned }, "Expired sessions cleaned");
  }
  
  return cleaned;
}