import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { logger } from "./logger";
import { MessageModel } from "../models/Message";
import { getRequestLogger } from "./logger";
import { verifyToken } from "@clerk/express";
import { setCollaborationIO, updateDocument as updateCollabDocument, updateCursor as updateCollabCursor, joinCollabSession, leaveCollabSession } from "./collaborativeEditor";
import { setWhiteboardIO, addElement, updateElement, deleteElement, clearWhiteboard, joinWhiteboard, leaveWhiteboard } from "./whiteboard";
import { setVideoCallIO, joinVideoSession, leaveVideoSession, toggleAudio, toggleVideo, relayWebRTCSignal } from "./videoCall";

interface SocketAuth {
  userId: string;
  fullName: string;
}

interface ChatSocket extends Socket {
  user?: SocketAuth;
  roomId?: string;
}

const onlineUsers = new Map<string, Set<string>>();

async function verifyClerkToken(token: string): Promise<{ userId: string; fullName?: string } | null> {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return {
      userId: payload.sub,
      fullName: (payload as { name?: string }).name,
    };
  } catch (error) {
    logger.warn({ err: (error as Error).message }, "Token verification failed");
    return null;
  }
}

export function createSocketServer(httpServer: HttpServer, corsOrigins: string[]) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  io.use(async (socket: ChatSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const clientUserId = socket.handshake.auth?.userId as string | undefined;
    const fullName = socket.handshake.auth?.fullName as string | undefined;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const verified = await verifyClerkToken(token);
      
      if (!verified) {
        return next(new Error("Invalid token"));
      }

      if (clientUserId && clientUserId !== verified.userId) {
        logger.warn({ clientUserId, tokenUserId: verified.userId }, "User ID mismatch");
        return next(new Error("User ID mismatch"));
      }

      socket.user = { 
        userId: verified.userId, 
        fullName: fullName || verified.fullName || "Anonymous" 
      };
      next();
    } catch (error) {
      logger.error({ err: (error as Error).message }, "Socket auth error");
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: ChatSocket) => {
    const correlationId = `socket-${socket.id.slice(0, 8)}`;
    const requestLogger = getRequestLogger(correlationId, socket.user?.userId);

    requestLogger.info(
      { transport: socket.conn.transport.name },
      "client connected"
    );

    socket.on("join-room", async (roomId: string) => {
      if (!roomId || typeof roomId !== "string") {
        socket.emit("error", { message: "Invalid roomId" });
        return;
      }

      socket.roomId = roomId;
      await socket.join(roomId);

      if (!onlineUsers.has(roomId)) onlineUsers.set(roomId, new Set());
      if (socket.user) onlineUsers.get(roomId)!.add(socket.user.userId);

      socket.to(roomId).emit("user-joined", {
        userId: socket.user?.userId,
        fullName: socket.user?.fullName,
        onlineCount: onlineUsers.get(roomId)?.size ?? 1,
      });

      try {
        const messages = await MessageModel.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        socket.emit("history", messages.reverse());
      } catch (err: unknown) {
        requestLogger.error(
          { err: (err as Error).message, roomId },
          "failed to fetch chat history"
        );
      }

      requestLogger.info({ roomId }, "joined room");
    });

    socket.on(
      "send-message",
      async (payload: {
        roomId: string;
        content: string;
        type?: "text" | "code";
      }) => {
        if (!socket.user) {
          socket.emit("error", { message: "Not authenticated" });
          return;
        }

        const { roomId, content, type = "text" } = payload;
        if (!roomId || !content || content.trim().length === 0) {
          socket.emit("error", { message: "Invalid message payload" });
          return;
        }

        if (content.length > 10000) {
          socket.emit("error", { message: "Message too long" });
          return;
        }

        try {
          const msg = await MessageModel.create({
            roomId,
            senderId: socket.user.userId,
            senderName: socket.user.fullName,
            content: content.trim(),
            type,
          });

          const broadcast = {
            id: msg._id.toString(),
            roomId,
            senderId: socket.user.userId,
            senderName: socket.user.fullName,
            content: content.trim(),
            type,
            createdAt: msg.createdAt,
          };

          io.to(roomId).emit("new-message", broadcast);
          requestLogger.info({ roomId, msgId: msg._id }, "message sent");
        } catch (err: unknown) {
          requestLogger.error(
            { err: (err as Error).message, roomId },
            "failed to persist message"
          );
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    socket.on("typing", (roomId: string, isTyping: boolean) => {
      if (!socket.user || !roomId) return;
      socket.to(roomId).emit("typing", {
        userId: socket.user.userId,
        fullName: socket.user.fullName,
        isTyping,
      });
    });

    /* -------------------------------------------------------------- */
    /*  Collaborative Editor Events                                      */
    /* -------------------------------------------------------------- */
    socket.on("collab:join", (sessionId: string) => {
      if (!socket.user) return;
      joinCollabSession(sessionId, socket.user.userId, socket.user.fullName);
    });

    socket.on("collab:leave", (sessionId: string) => {
      if (!socket.user) return;
      leaveCollabSession(sessionId, socket.user.userId);
    });

    socket.on("collab:update-document", (payload: { sessionId: string; code: string }) => {
      if (!socket.user) return;
      updateCollabDocument(payload.sessionId, payload.code, socket.user.userId);
    });

    socket.on("collab:update-cursor", (payload: { sessionId: string; position: number }) => {
      if (!socket.user) return;
      updateCollabCursor(payload.sessionId, socket.user.userId, payload.position);
    });

    /* -------------------------------------------------------------- */
    /*  Whiteboard Events                                                */
    /* -------------------------------------------------------------- */
    socket.on("whiteboard:join", (sessionId: string) => {
      if (!socket.user) return;
      joinWhiteboard(sessionId, socket.user.userId);
    });

    socket.on("whiteboard:leave", (sessionId: string) => {
      if (!socket.user) return;
      leaveWhiteboard(sessionId, socket.user.userId);
    });

    socket.on("whiteboard:add-element", (payload: { sessionId: string; element: any }) => {
      if (!socket.user) return;
      addElement(payload.sessionId, { ...payload.element, createdBy: socket.user.userId });
    });

    socket.on("whiteboard:update-element", (payload: { sessionId: string; elementId: string; updates: any }) => {
      updateElement(payload.sessionId, payload.elementId, payload.updates);
    });

    socket.on("whiteboard:delete-element", (payload: { sessionId: string; elementId: string }) => {
      deleteElement(payload.sessionId, payload.elementId);
    });

    socket.on("whiteboard:clear", (sessionId: string) => {
      clearWhiteboard(sessionId);
    });

    /* -------------------------------------------------------------- */
    /*  Video Call / WebRTC Events                                       */
    /* -------------------------------------------------------------- */
    socket.on("video:join", (payload: { sessionId: string; userName: string }) => {
      if (!socket.user) return;
      joinVideoSession(payload.sessionId, socket.user.userId, payload.userName || socket.user.fullName);
    });

    socket.on("video:leave", (sessionId: string) => {
      if (!socket.user) return;
      leaveVideoSession(sessionId, socket.user.userId);
    });

    socket.on("video:toggle-audio", (payload: { sessionId: string; enabled: boolean }) => {
      if (!socket.user) return;
      toggleAudio(payload.sessionId, socket.user.userId, payload.enabled);
    });

    socket.on("video:toggle-video", (payload: { sessionId: string; enabled: boolean }) => {
      if (!socket.user) return;
      toggleVideo(payload.sessionId, socket.user.userId, payload.enabled);
    });

    socket.on("video:webrtc-signal", (payload: { sessionId: string; signal: any }) => {
      relayWebRTCSignal(payload.sessionId, payload.signal);
    });

    socket.on("disconnect", (reason: string) => {
      const roomId = socket.roomId;
      if (roomId && socket.user) {
        onlineUsers.get(roomId)?.delete(socket.user.userId);
        socket.to(roomId).emit("user-left", {
          userId: socket.user.userId,
          fullName: socket.user.fullName,
          onlineCount: onlineUsers.get(roomId)?.size ?? 0,
        });
      }
      requestLogger.info({ reason, roomId }, "client disconnected");
    });
  });

  /* Wire IO instances into real-time service modules */
  setCollaborationIO(io);
  setWhiteboardIO(io);
  setVideoCallIO(io);

  return io;
}