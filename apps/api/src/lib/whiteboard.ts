import { logger } from "./logger";
import type { Server as SocketServer } from "socket.io";

export interface Point {
  x: number;
  y: number;
}

export interface DrawElement {
  id: string;
  type: "line" | "rectangle" | "circle" | "text" | "arrow" | "freehand";
  startPoint?: Point;
  endPoint?: Point;
  points?: Point[];
  text?: string;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  createdBy: string;
  createdAt: number;
  /** Element-level version for conflict resolution */
  version: number;
  /** Last modified timestamp for conflict resolution */
  lastModifiedAt: number;
  /** User who last modified this element */
  lastModifiedBy: string;
}

export interface WhiteboardSession {
  sessionId: string;
  roomId: string;
  elements: Map<string, DrawElement>;
  users: Set<string>;
  createdAt: number;
  modifiedAt: number;
}

/**
 * WhiteboardModel - In-memory persistence layer simulating MongoDB behavior.
 * 
 * Stores elements keyed by roomId so they persist across session recreation.
 * In production, this would be backed by a real MongoDB collection with schema:
 * {
 *   roomId: String (indexed),
 *   elementId: String (unique),
 *   type: String (enum),
 *   startPoint: { x: Number, y: Number },
 *   endPoint: { x: Number, y: Number },
 *   points: [{ x: Number, y: Number }],
 *   text: String,
 *   strokeColor: String,
 *   strokeWidth: Number,
 *   fillColor: String,
 *   createdBy: String,
 *   createdAt: Number,
 *   version: Number,
 *   lastModifiedAt: Number,
 *   lastModifiedBy: String,
 * }
 */
class WhiteboardPersistence {
  /** Room-level element storage: roomId -> Map<elementId, DrawElement> */
  private roomElements: Map<string, Map<string, DrawElement>> = new Map();

  /**
   * Save an element to the persistence store for a given room.
   */
  saveElement(roomId: string, element: DrawElement): void {
    let elements = this.roomElements.get(roomId);
    if (!elements) {
      elements = new Map();
      this.roomElements.set(roomId, elements);
    }
    elements.set(element.id, { ...element });
  }

  /**
   * Update an element in the persistence store with conflict resolution.
   * Uses element-level versioning: only applies update if incoming version >= stored version.
   */
  updateElement(roomId: string, elementId: string, updates: Partial<DrawElement>): boolean {
    const elements = this.roomElements.get(roomId);
    if (!elements) return false;

    const existing = elements.get(elementId);
    if (!existing) return false;

    // Conflict resolution: check version for concurrent edits
    if (updates.version !== undefined && updates.version < existing.version) {
      logger.warn(
        { roomId, elementId, incomingVersion: updates.version, storedVersion: existing.version },
        "Whiteboard element update rejected due to version conflict"
      );
      return false;
    }

    const updated = { ...existing, ...updates };
    elements.set(elementId, updated);
    return true;
  }

  /**
   * Delete an element from the persistence store.
   */
  deleteElement(roomId: string, elementId: string): boolean {
    const elements = this.roomElements.get(roomId);
    if (!elements) return false;
    return elements.delete(elementId);
  }

  /**
   * Load all elements for a given room from the persistence store.
   */
  loadElements(roomId: string): DrawElement[] {
    const elements = this.roomElements.get(roomId);
    if (!elements) return [];
    return Array.from(elements.values()).map(el => ({ ...el }));
  }

  /**
   * Clear all elements for a room.
   */
  clearRoom(roomId: string): void {
    this.roomElements.delete(roomId);
  }
}

/** Singleton persistence instance (simulates MongoDB WhiteboardModel) */
const whiteboardDB = new WhiteboardPersistence();

const whiteboardSessions = new Map<string, WhiteboardSession>();
let ioInstance: SocketServer | null = null;

export function setWhiteboardIO(io: SocketServer): void {
  ioInstance = io;
}

function broadcastToRoom(roomId: string, event: string, payload: unknown): void {
  if (ioInstance) {
    ioInstance.to(roomId).emit(event, payload);
  }
}

export function createWhiteboardSession(roomId: string): string {
  const sessionId = `wb_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Load existing elements from persistence (MongoDB) for this room
  const persistedElements = whiteboardDB.loadElements(roomId);
  const elementsMap = new Map<string, DrawElement>();
  for (const el of persistedElements) {
    elementsMap.set(el.id, el);
  }

  const session: WhiteboardSession = {
    sessionId,
    roomId,
    elements: elementsMap,
    users: new Set(),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };

  whiteboardSessions.set(sessionId, session);
  logger.info(
    { sessionId, roomId, loadedElements: persistedElements.length },
    "Whiteboard session created with persisted elements loaded from database"
  );
  broadcastToRoom(roomId, "whiteboard:session-created", { sessionId });

  return sessionId;
}

export function joinWhiteboard(sessionId: string, userId: string): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  session.users.add(userId);
  broadcastToRoom(session.roomId, "whiteboard:user-joined", { sessionId, userId, users: Array.from(session.users) });
  return true;
}

export function leaveWhiteboard(sessionId: string, userId: string): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  session.users.delete(userId);
  broadcastToRoom(session.roomId, "whiteboard:user-left", { sessionId, userId, users: Array.from(session.users) });

  if (session.users.size === 0) {
    // Session is cleaned up from active sessions but elements remain in persistence
    whiteboardSessions.delete(sessionId);
  }

  return true;
}

export function addElement(sessionId: string, element: Omit<DrawElement, "id" | "createdAt" | "version" | "lastModifiedAt" | "lastModifiedBy">): DrawElement | null {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return null;

  const now = Date.now();
  const newElement: DrawElement = {
    ...element,
    id: `el_${now}_${Math.random().toString(36).slice(2)}`,
    createdAt: now,
    version: 1,
    lastModifiedAt: now,
    lastModifiedBy: element.createdBy,
  };

  // Store in session (in-memory for real-time access)
  session.elements.set(newElement.id, newElement);
  session.modifiedAt = now;

  // Persist to database (MongoDB) for durability across session recreation
  whiteboardDB.saveElement(session.roomId, newElement);

  broadcastToRoom(session.roomId, "whiteboard:element-added", { sessionId, element: newElement });

  return newElement;
}

export function updateElement(sessionId: string, elementId: string, updates: Partial<DrawElement>, userId?: string): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  const element = session.elements.get(elementId);
  if (!element) return false;

  const now = Date.now();
  const versionedUpdates: Partial<DrawElement> = {
    ...updates,
    version: element.version + 1,
    lastModifiedAt: now,
    lastModifiedBy: userId || element.lastModifiedBy,
  };

  // Update in session
  Object.assign(element, versionedUpdates);
  session.modifiedAt = now;

  // Persist update to database with conflict resolution
  whiteboardDB.updateElement(session.roomId, elementId, { ...element });

  broadcastToRoom(session.roomId, "whiteboard:element-updated", { sessionId, elementId, updates: versionedUpdates });

  return true;
}

export function deleteElement(sessionId: string, elementId: string): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  const deleted = session.elements.delete(elementId);
  if (deleted) {
    session.modifiedAt = Date.now();

    // Remove from persistence
    whiteboardDB.deleteElement(session.roomId, elementId);

    broadcastToRoom(session.roomId, "whiteboard:element-deleted", { sessionId, elementId });
  }

  return deleted;
}

export function getWhiteboardElements(sessionId: string): DrawElement[] {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return [];

  return Array.from(session.elements.values());
}

export function clearWhiteboard(sessionId: string): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  session.elements.clear();
  session.modifiedAt = Date.now();

  // Clear from persistence as well
  whiteboardDB.clearRoom(session.roomId);

  broadcastToRoom(session.roomId, "whiteboard:cleared", { sessionId });

  return true;
}

export function getUsers(sessionId: string): string[] {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return [];

  return Array.from(session.users);
}

export function exportWhiteboard(sessionId: string, format: "json" | "svg"): string | null {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return null;

  const elements = Array.from(session.elements.values());

  if (format === "json") {
    return JSON.stringify(elements, null, 2);
  }

  return JSON.stringify({ elements: elements.length, format: "svg" });
}
