import { logger } from "./logger";
import type { Server as SocketServer } from "socket.io";
import { DrawElementModel } from "../models/DrawElement";

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
  version: number;
  lastModifiedAt: number;
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

const elementTypeToModel: Record<string, string> = {
  line: "line",
  rectangle: "rect",
  circle: "circle",
  text: "text",
  arrow: "line",
  freehand: "path",
};

const modelTypeToElement: Record<string, string> = {
  line: "line",
  rect: "rectangle",
  circle: "circle",
  text: "text",
  path: "freehand",
  image: "line",
};

function drawElementToModel(sessionId: string, el: DrawElement): Record<string, unknown> {
  const points: Point[] = [];
  if (el.startPoint) points.push(el.startPoint);
  if (el.endPoint) points.push(el.endPoint);
  if (el.points) points.push(...el.points);

  return {
    id: el.id,
    sessionId,
    type: elementTypeToModel[el.type] || "line",
    points: points.length > 0 ? points : undefined,
    color: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: el.fillColor,
    text: el.text,
    zIndex: 0,
    createdBy: el.createdBy,
  };
}

function modelToDrawElement(doc: any): DrawElement {
  const points = (doc.points as Point[]) || [];
  const now = Date.now();
  return {
    id: doc.id as string,
    type: (modelTypeToElement[(doc.type as string)] || "freehand") as DrawElement["type"],
    startPoint: points.length > 0 ? points[0] : undefined,
    endPoint: points.length > 1 ? points[points.length - 1] : undefined,
    points: points.length > 2 ? points.slice(1, -1) : undefined,
    text: doc.text as string | undefined,
    strokeColor: (doc.color as string) || "#000000",
    strokeWidth: (doc.strokeWidth as number) || 2,
    fillColor: doc.fill as string | undefined,
    createdBy: (doc.createdBy as string) || "unknown",
    createdAt: doc.createdAt ? new Date(doc.createdAt as string).getTime() : now,
    version: 1,
    lastModifiedAt: doc.updatedAt ? new Date(doc.updatedAt as string).getTime() : now,
    lastModifiedBy: (doc.createdBy as string) || "unknown",
  };
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

export async function createWhiteboardSession(roomId: string): Promise<string> {
  const sessionId = `wb_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const persistedElements = await DrawElementModel.find({ sessionId });
  const elementsMap = new Map<string, DrawElement>();
  for (const el of persistedElements) {
    const de = modelToDrawElement(el.toObject());
    elementsMap.set(de.id, de);
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

export async function joinWhiteboard(sessionId: string, userId: string): Promise<boolean> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  session.users.add(userId);
  broadcastToRoom(session.roomId, "whiteboard:user-joined", { sessionId, userId, users: Array.from(session.users) });
  return true;
}

export async function leaveWhiteboard(sessionId: string, userId: string): Promise<boolean> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  session.users.delete(userId);
  broadcastToRoom(session.roomId, "whiteboard:user-left", { sessionId, userId, users: Array.from(session.users) });

  if (session.users.size === 0) {
    whiteboardSessions.delete(sessionId);
  }

  return true;
}

export async function addElement(sessionId: string, element: Omit<DrawElement, "id" | "createdAt" | "version" | "lastModifiedAt" | "lastModifiedBy">): Promise<DrawElement | null> {
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

  session.elements.set(newElement.id, newElement);
  session.modifiedAt = now;

  const modelData = drawElementToModel(session.roomId, newElement);
  await DrawElementModel.create(modelData);

  broadcastToRoom(session.roomId, "whiteboard:element-added", { sessionId, element: newElement });

  return newElement;
}

export async function updateElement(sessionId: string, elementId: string, updates: Partial<DrawElement>, userId?: string): Promise<boolean> {
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

  Object.assign(element, versionedUpdates);
  session.modifiedAt = now;

  const setFields: Record<string, unknown> = {};
  if (updates.strokeColor !== undefined) setFields.color = updates.strokeColor;
  if (updates.strokeWidth !== undefined) setFields.strokeWidth = updates.strokeWidth;
  if (updates.fillColor !== undefined) setFields.fill = updates.fillColor;
  if (updates.text !== undefined) setFields.text = updates.text;
  if (updates.type !== undefined) setFields.type = elementTypeToModel[updates.type] || "line";
  if (updates.points !== undefined) setFields.points = updates.points;
  if (updates.startPoint !== undefined) {
    const points: Point[] = [];
    points.push(updates.startPoint);
    if (element.endPoint) points.push(element.endPoint);
    setFields.points = points;
  }
  if (updates.endPoint !== undefined) {
    const points: Point[] = [];
    if (element.startPoint) points.push(element.startPoint);
    points.push(updates.endPoint);
    setFields.points = points;
  }

  if (Object.keys(setFields).length > 0) {
    await DrawElementModel.findOneAndUpdate(
      { id: elementId },
      { $set: setFields }
    );
  }

  broadcastToRoom(session.roomId, "whiteboard:element-updated", { sessionId, elementId, updates: versionedUpdates });

  return true;
}

export async function deleteElement(sessionId: string, elementId: string): Promise<boolean> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  const deleted = session.elements.delete(elementId);
  if (deleted) {
    session.modifiedAt = Date.now();
    await DrawElementModel.deleteOne({ id: elementId });
    broadcastToRoom(session.roomId, "whiteboard:element-deleted", { sessionId, elementId });
  }

  return deleted;
}

export async function getWhiteboardElements(sessionId: string): Promise<DrawElement[]> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return [];

  return Array.from(session.elements.values());
}

export async function clearWhiteboard(sessionId: string): Promise<boolean> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return false;

  session.elements.clear();
  session.modifiedAt = Date.now();

  await DrawElementModel.deleteMany({ sessionId });

  broadcastToRoom(session.roomId, "whiteboard:cleared", { sessionId });

  return true;
}

export async function getUsers(sessionId: string): Promise<string[]> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return [];

  return Array.from(session.users);
}

export async function exportWhiteboard(sessionId: string, format: "json" | "svg"): Promise<string | null> {
  const session = whiteboardSessions.get(sessionId);
  if (!session) return null;

  const elements = Array.from(session.elements.values());

  if (format === "json") {
    return JSON.stringify(elements, null, 2);
  }

  return JSON.stringify({ elements: elements.length, format: "svg" });
}
