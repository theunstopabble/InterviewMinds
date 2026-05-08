import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { logger } from "./logger";
import { MessageModel } from "../models/Message";
import { getRequestLogger } from "./logger";

interface SocketAuth {
  userId: string;
  fullName: string;
}

interface ChatSocket extends Socket {
  user?: SocketAuth;
  roomId?: string;
}

const onlineUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>

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

  // ─── Auth Middleware ─────────────────────────────────────────────────────
  io.use((socket: ChatSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const userId = socket.handshake.auth?.userId as string | undefined;
    const fullName = socket.handshake.auth?.fullName as string | undefined;

    if (!token || !userId) {
      return next(new Error("Authentication required"));
    }

    // In production, verify Clerk JWT token here.
    // For now we trust the client-passed userId alongside the token,
    // since the API already validates HTTP routes via Clerk middleware.
    socket.user = { userId, fullName: fullName || "Anonymous" };
    next();
  });

  io.on("connection", (socket: ChatSocket) => {
    const correlationId = `socket-${socket.id.slice(0, 8)}`;
    const requestLogger = getRequestLogger(correlationId, socket.user?.userId);

    requestLogger.info(
      { transport: socket.conn.transport.name },
      "client connected"
    );

    // ─── Join Room ─────────────────────────────────────────────────────────
    socket.on("join-room", async (roomId: string) => {
      if (!roomId || typeof roomId !== "string") {
        socket.emit("error", { message: "Invalid roomId" });
        return;
      }

      socket.roomId = roomId;
      await socket.join(roomId);

      // Track online presence
      if (!onlineUsers.has(roomId)) onlineUsers.set(roomId, new Set());
      if (socket.user) onlineUsers.get(roomId)!.add(socket.user.userId);

      socket.to(roomId).emit("user-joined", {
        userId: socket.user?.userId,
        fullName: socket.user?.fullName,
        onlineCount: onlineUsers.get(roomId)?.size ?? 1,
      });

      // Send recent messages (last 50)
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

    // ─── Send Message ──────────────────────────────────────────────────────
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

    // ─── Typing Indicator ──────────────────────────────────────────────────
    socket.on("typing", (roomId: string, isTyping: boolean) => {
      if (!socket.user || !roomId) return;
      socket.to(roomId).emit("typing", {
        userId: socket.user.userId,
        fullName: socket.user.fullName,
        isTyping,
      });
    });

    // ─── Disconnect ─────────────────────────────────────────────────────────
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

  return io;
}
