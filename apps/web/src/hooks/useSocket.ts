import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth, useUser } from "@clerk/clerk-react";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "system" | "code";
  createdAt: string;
}

export interface TypingEvent {
  userId: string;
  fullName: string;
  isTyping: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  messages: ChatMessage[];
  typingUsers: Map<string, TypingEvent>;
  onlineCount: number;
  joinRoom: (roomId: string) => void;
  sendMessage: (content: string, type?: "text" | "code") => void;
  setTyping: (isTyping: boolean) => void;
  error: string | null;
}

export function useSocket(roomId?: string): UseSocketReturn {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingEvent>>(new Map());
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    const token = await getToken();
    if (!token || !userId) {
      setError("Authentication required for real-time chat");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const socket = io(apiUrl, {
      auth: {
        token,
        userId,
        fullName: user?.fullName || user?.username || "Anonymous",
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      // Re-join room if already had one
      if (currentRoomRef.current) {
        socket.emit("join-room", currentRoomRef.current);
      }
    });

    socket.on("disconnect", (reason: string) => {
      setIsConnected(false);
      if (reason === "io server disconnect") {
        // Server forced disconnect, wait for auto-reconnect
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      }
    });

    socket.on("connect_error", (err: Error) => {
      setError(`Connection error: ${err.message}`);
    });

    socket.on("error", (payload: { message: string }) => {
      setError(payload.message);
    });

    socket.on("new-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("history", (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on("typing", (event: TypingEvent) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (event.isTyping) {
          next.set(event.userId, event);
        } else {
          next.delete(event.userId);
        }
        return next;
      });
    });

    socket.on("user-joined", (payload: { onlineCount: number }) => {
      setOnlineCount(payload.onlineCount);
    });

    socket.on("user-left", (payload: { onlineCount: number }) => {
      setOnlineCount(payload.onlineCount);
    });
  }, [getToken, userId, user]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    if (roomId && socketRef.current?.connected) {
      currentRoomRef.current = roomId;
      socketRef.current.emit("join-room", roomId);
      setMessages([]);
      setTypingUsers(new Map());
    }
  }, [roomId]);

  const joinRoom = useCallback((id: string) => {
    currentRoomRef.current = id;
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-room", id);
      setMessages([]);
      setTypingUsers(new Map());
    }
  }, []);

  const sendMessage = useCallback(
    (content: string, type: "text" | "code" = "text") => {
      if (!socketRef.current?.connected || !currentRoomRef.current) {
        setError("Not connected to chat room");
        return;
      }
      socketRef.current.emit("send-message", {
        roomId: currentRoomRef.current,
        content,
        type,
      });
    },
    []
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current?.connected || !currentRoomRef.current) return;
      socketRef.current.emit("typing", currentRoomRef.current, isTyping);
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    messages,
    typingUsers,
    onlineCount,
    joinRoom,
    sendMessage,
    setTyping,
    error,
  };
}
