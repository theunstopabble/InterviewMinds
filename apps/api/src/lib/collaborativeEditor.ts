import { logger } from "./logger";

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
  
  return sessionId;
}

export function joinCollabSession(sessionId: string, userId: string, userName: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  
  const colorIndex = session.users.size % USER_COLORS.length;
  session.users.set(userId, { id: userId, name: userName, color: USER_COLORS[colorIndex] });
  
  logger.info({ sessionId, userId, users: session.users.size }, "User joined session");
  return true;
}

export function leaveCollabSession(sessionId: string, userId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  
  session.users.delete(userId);
  
  if (session.users.size === 0) {
    activeSessions.delete(sessionId);
    logger.info({ sessionId }, "Session ended - no users left");
  }
  
  return true;
}

export function updateDocument(sessionId: string, code: string): string | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  
  session.document = code;
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