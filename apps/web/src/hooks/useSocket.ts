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
  reconnect: () => void;
}

const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

export function useSocket(roomId?: string): UseSocketReturn {
  const { getToken, userId, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingEvent>>(new Map());
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  const disconnectSocket = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(async (isReconnect = false) => {
    if (isConnectingRef.current || socketRef.current?.connected) {
      return;
    }

    if (!authLoaded) {
      setError("Auth not loaded yet");
      return;
    }

    const token = await getToken();
    if (!token || !userId) {
      setError("Authentication required for real-time chat");
      return;
    }

    isConnectingRef.current = true;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const socket = io(apiUrl, {
        auth: {
          token,
          userId,
          fullName: user?.fullName || user?.username || "Anonymous",
        },
        transports: ["websocket", "polling"],
        reconnection: false,
        timeout: 20000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;

        if (currentRoomRef.current) {
          socket.emit("join-room", currentRoomRef.current);
        }

        if (!tokenRefreshIntervalRef.current) {
          tokenRefreshIntervalRef.current = setInterval(async () => {
            try {
              const newToken = await getToken();
              if (newToken && socketRef.current?.connected) {
                const io = socketRef.current.io as { opts?: { auth?: Record<string, string> } };
                if (io.opts?.auth) {
                  io.opts.auth = {
                    ...io.opts.auth,
                    token: newToken,
                  };
                }
              }
            } catch (err) {
              console.error("Token refresh failed:", err);
            }
          }, TOKEN_REFRESH_INTERVAL);
        }
      });

      socket.on("disconnect", (reason: string) => {
        setIsConnected(false);

        if (tokenRefreshIntervalRef.current) {
          clearInterval(tokenRefreshIntervalRef.current);
          tokenRefreshIntervalRef.current = null;
        }

        if (reason === "io server disconnect" && !isReconnect) {
          handleReconnect();
        }
      });

      socket.on("connect_error", (err: Error) => {
        isConnectingRef.current = false;
        setError(`Connection error: ${err.message}`);
        handleReconnect();
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
    } catch (err) {
      isConnectingRef.current = false;
      setError("Failed to initialize connection");
      console.error("Socket connection error:", err);
    }
  }, [getToken, userId, user, authLoaded]);

  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError("Maximum reconnection attempts reached");
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    reconnectTimeoutRef.current = setTimeout(() => {
      connect(true);
    }, RECONNECT_DELAY * reconnectAttemptsRef.current);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      disconnectSocket();
    };
  }, [connect, disconnectSocket]);

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

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnectSocket();
    connect();
  }, [connect, disconnectSocket]);

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
    reconnect,
  };
}