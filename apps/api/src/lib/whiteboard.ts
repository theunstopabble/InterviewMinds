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
}

export interface WhiteboardSession {
  sessionId: string;
  roomId: string;
  elements: Map<string, DrawElement>;
  users: Set<string>;
  createdAt: number;
  modifiedAt: number;
}

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

  const session: WhiteboardSession = {
    sessionId,
    roomId,
    elements: new Map(),
    users: new Set(),
    createdAt: Date.now(),
    modifiedAt: Date.now(),
  };

  whiteboardSessions.set(sessionId, session);
  logger.info({ sessionId, roomId }, "Whiteboard session created");
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
    whiteboardSessions.delete(sessionId);
  }

  return true;
}

export function addElement(sessionId: string, element: Omit<DrawElement, "id" | "createdAt">): DrawElement | null {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return null;

  const newElement: DrawElement = {
    ...element,
    id: `el_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };

  session.elements.set(newElement.id, newElement);
  session.modifiedAt = Date.now();
  broadcastToRoom(session.roomId, "whiteboard:element-added", { sessionId, element: newElement });

  return newElement;
}

export function updateElement(sessionId: string, elementId: string, updates: Partial<DrawElement>): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  const element = session.elements.get(elementId);
  if (!element) return false;

  Object.assign(element, updates);
  session.modifiedAt = Date.now();
  broadcastToRoom(session.roomId, "whiteboard:element-updated", { sessionId, elementId, updates });

  return true;
}

export function deleteElement(sessionId: string, elementId: string): boolean {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  const deleted = session.elements.delete(elementId);
  if (deleted) {
    session.modifiedAt = Date.now();
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