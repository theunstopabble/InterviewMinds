import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import express from "express";
import { io as ClientIo, Socket as ClientSocket } from "socket.io-client";
import { createSocketServer } from "../lib/socket";
import { MessageModel } from "../models/Message";

// Mock MessageModel to avoid real DB in socket tests
vi.mock("../models/Message", () => ({
  MessageModel: {
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({
          lean: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    create: vi.fn((data: any) => Promise.resolve({ _id: "msg_123", ...data, createdAt: new Date() })),
  },
}));

function waitForEvent(socket: ClientSocket, event: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);
    socket.once(event, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

describe.skip("Socket.IO Chat Server", () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: ReturnType<typeof createSocketServer>;
  let clientSocket: ClientSocket;
  const port = 9999;

  beforeEach(async () => {
    const app = express();
    httpServer = createServer(app);
    ioServer = createSocketServer(httpServer, ["http://localhost:5173"]);

    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });

    clientSocket = ClientIo(`http://localhost:${port}`, {
      auth: {
        token: "mock-token",
        userId: "test-user-123",
        fullName: "Test User",
      },
      transports: ["websocket"],
    });

    await waitForEvent(clientSocket, "connect");
  });

  afterEach(() => {
    clientSocket.disconnect();
    ioServer.close();
    httpServer.close();
    vi.clearAllMocks();
  });

  it("should connect authenticated client", () => {
    expect(clientSocket.connected).toBe(true);
  });

  it("should receive history after joining room", async () => {
    (MessageModel.find as any).mockReturnValueOnce({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({
          lean: vi.fn(() => Promise.resolve([
            { _id: "1", roomId: "room-1", senderId: "u1", senderName: "A", content: "Hello", type: "text", createdAt: new Date() },
          ])),
        })),
      })),
    });

    clientSocket.emit("join-room", "room-1");
    const history = await waitForEvent(clientSocket, "history");
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe("Hello");
  });

  it("should broadcast message to room", async () => {
    const client2 = ClientIo(`http://localhost:${port}`, {
      auth: { token: "mock-token", userId: "user-2", fullName: "User 2" },
      transports: ["websocket"],
    });

    await waitForEvent(client2, "connect");

    clientSocket.emit("join-room", "room-broadcast");
    client2.emit("join-room", "room-broadcast");

    // Wait for join events to settle
    await new Promise((r) => setTimeout(r, 50));

    clientSocket.emit("send-message", {
      roomId: "room-broadcast",
      content: "Hello room",
      type: "text",
    });

    const msg = await waitForEvent(client2, "new-message");
    expect(msg.content).toBe("Hello room");
    expect(msg.senderId).toBe("test-user-123");

    client2.disconnect();
  });

  it("should reject connection without auth", async () => {
    const badClient = ClientIo(`http://localhost:${port}`, {
      auth: {},
      transports: ["websocket"],
    });

    const err = await waitForEvent(badClient, "connect_error");
    expect(err.message).toContain("Authentication required");
    badClient.disconnect();
  });
});
