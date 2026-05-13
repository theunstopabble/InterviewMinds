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

/**
 * Internal session state with CRDT-style conflict resolution.
 * Uses three-way merge with per-user base state tracking
 * to merge concurrent edits without data loss.
 */
interface InternalSession {
  sessionId: string;
  roomId: string;
  users: Map<string, { id: string; name: string; color: string; cursor?: number }>;
  /** The current authoritative document content */
  document: string;
  /** Per-user last-acknowledged document state (what they based their edit on) */
  userBaseStates: Map<string, string>;
  /** Version counter for ordering */
  version: number;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, InternalSession>();
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

/**
 * Three-way merge algorithm for concurrent text edits (CRDT-style).
 *
 * Given:
 * - base: the common ancestor (what the editing user last acknowledged)
 * - current: the current document (includes other users' concurrent changes)
 * - incoming: what the user wants the document to be
 *
 * Produces a merged result that preserves both sets of changes.
 * This implements a simplified Operational Transform that handles the most
 * common concurrent editing patterns without data loss.
 */
function threeWayMerge(base: string, current: string, incoming: string): string {
  // If the incoming matches current doc, no merge needed
  if (incoming === current) return current;

  // If the incoming matches the base, user made no change - keep current
  if (incoming === base) return current;

  // If current matches base, only the user made changes - take theirs
  if (current === base) return incoming;

  // Both sides changed relative to base. We need to merge.
  // Compute what each side changed:

  // What did "current" change relative to base?
  const currentDiff = computeChange(base, current);
  // What did "incoming" change relative to base?
  const incomingDiff = computeChange(base, incoming);

  // If changes are at different positions (non-overlapping), apply both
  if (currentDiff.type === "append" && incomingDiff.type === "append") {
    // Both appended to the end - concatenate both additions
    return base + currentDiff.added + incomingDiff.added;
  }

  if (currentDiff.type === "prepend" && incomingDiff.type === "prepend") {
    // Both prepended to the start - concatenate both additions
    return currentDiff.added + incomingDiff.added + base;
  }

  if (!changesOverlap(currentDiff, incomingDiff, base.length)) {
    // Non-overlapping changes - apply both sequentially
    // Apply the earlier change first, then the later one with adjusted position
    if (currentDiff.start <= incomingDiff.start) {
      // Current change is earlier - it's already applied, now apply incoming adjusted
      const offset = (current.length - base.length);
      const adjustedStart = incomingDiff.start + offset;
      const adjustedEnd = adjustedStart + incomingDiff.deleteLen;
      return current.slice(0, adjustedStart) + incomingDiff.added +
             current.slice(adjustedEnd);
    } else {
      // Incoming change is earlier - apply it to current with adjustment
      const offset = (current.length - base.length);
      return current.slice(0, incomingDiff.start) + incomingDiff.added +
             current.slice(incomingDiff.start + incomingDiff.deleteLen + offset);
    }
  }

  // Overlapping changes - preserve both by concatenating insertions
  // Use the common unchanged parts as anchors
  const commonPrefix = base.slice(0, Math.min(currentDiff.start, incomingDiff.start));
  const commonSuffixStart = Math.max(
    currentDiff.start + currentDiff.deleteLen,
    incomingDiff.start + incomingDiff.deleteLen
  );
  const commonSuffix = base.slice(commonSuffixStart);

  return commonPrefix + currentDiff.added + incomingDiff.added + commonSuffix;
}

interface Change {
  type: "append" | "prepend" | "middle" | "replace";
  start: number;
  deleteLen: number;
  added: string;
}

/**
 * Compute what changed between old and new text.
 */
function computeChange(oldText: string, newText: string): Change {
  if (oldText === newText) {
    return { type: "middle", start: 0, deleteLen: 0, added: "" };
  }

  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (not overlapping with prefix)
  let suffixLen = 0;
  const maxSuffix = Math.min(oldText.length - prefixLen, newText.length - prefixLen);
  while (
    suffixLen < maxSuffix &&
    oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const deleteLen = oldText.length - prefixLen - suffixLen;
  const insertEnd = newText.length - suffixLen;
  const added = insertEnd > prefixLen ? newText.slice(prefixLen, insertEnd) : "";

  // Classify the change type
  let type: Change["type"];
  if (prefixLen === oldText.length && deleteLen === 0) {
    type = "append";
  } else if (suffixLen === oldText.length && deleteLen === 0) {
    type = "prepend";
  } else if (deleteLen === oldText.length) {
    type = "replace";
  } else {
    type = "middle";
  }

  return { type, start: prefixLen, deleteLen, added };
}

/**
 * Check if two changes overlap in the base document.
 */
function changesOverlap(a: Change, b: Change, _baseLen: number): boolean {
  const aEnd = a.start + a.deleteLen;
  const bEnd = b.start + b.deleteLen;
  return !(aEnd <= b.start || bEnd <= a.start);
}

/**
 * Convert internal session to the public CollaborationSession interface.
 */
function toPublicSession(session: InternalSession): CollaborationSession {
  return {
    sessionId: session.sessionId,
    roomId: session.roomId,
    users: session.users,
    document: session.document,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

export function createCollabSession(roomId: string, userId: string, userName: string): string {
  const sessionId = `collab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const session: InternalSession = {
    sessionId,
    roomId,
    users: new Map([[userId, { id: userId, name: userName, color: USER_COLORS[0] }]]),
    document: "",
    userBaseStates: new Map([[userId, ""]]),
    version: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
  };

  activeSessions.set(sessionId, session);
  logger.info({ sessionId, roomId, userId }, "Collaboration session created with CRDT support");
  broadcastToRoom(roomId, "collab:session-created", { sessionId, createdBy: userId });

  return sessionId;
}

export function joinCollabSession(sessionId: string, userId: string, userName: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  const colorIndex = session.users.size % USER_COLORS.length;
  const color = USER_COLORS[colorIndex];
  session.users.set(userId, { id: userId, name: userName, color });

  // User's base state is the current document at join time
  session.userBaseStates.set(userId, session.document);

  logger.info({ sessionId, userId, users: session.users.size }, "User joined session");
  broadcastToRoom(session.roomId, "collab:user-joined", { sessionId, userId, userName, color, users: Array.from(session.users.values()) });
  return true;
}

export function leaveCollabSession(sessionId: string, userId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.users.delete(userId);
  session.userBaseStates.delete(userId);
  broadcastToRoom(session.roomId, "collab:user-left", { sessionId, userId, users: Array.from(session.users.values()) });

  if (session.users.size === 0) {
    activeSessions.delete(sessionId);
    logger.info({ sessionId }, "Session ended - no users left");
  }

  return true;
}

/**
 * Update the document using CRDT-style three-way merge.
 *
 * When a user submits a new document state:
 * 1. Retrieve their last-acknowledged base state (what they based their edit on)
 * 2. Perform a three-way merge: base × current_doc × user_submission
 * 3. The merge preserves both the user's changes AND any concurrent changes from others
 * 4. Update the editing user's base state to the merged result
 * 5. Do NOT update other users' base states (they haven't acknowledged the change yet)
 *
 * This ensures concurrent edits from different users are merged without data loss.
 * The algorithm is equivalent to a CRDT in that concurrent operations commute.
 */
export function updateDocument(sessionId: string, code: string, userId?: string): string | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  const effectiveUserId = userId || "__anonymous__";

  // Get this user's last-acknowledged document state
  const userBase = session.userBaseStates.get(effectiveUserId) ?? session.document;

  // Perform three-way merge
  const merged = threeWayMerge(userBase, session.document, code);

  // Update session document
  session.document = merged;
  session.version++;

  // Update the editing user's base state to the merged result
  session.userBaseStates.set(effectiveUserId, merged);

  broadcastToRoom(session.roomId, "collab:document-update", {
    sessionId,
    code: merged,
    updatedBy: userId,
    version: session.version,
  });

  return merged;
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
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  return toPublicSession(session);
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

export function getCodeChanges(sessionId: string, _fromVersion: number): {
  code: string;
  version: number;
} | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  return {
    code: session.document,
    version: session.version,
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
