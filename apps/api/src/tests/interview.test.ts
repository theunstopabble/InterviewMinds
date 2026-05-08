import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mockAuthMiddleware, mockAuthUserId, createMockModel, clearAllMocks } from "./helpers";

// Mock groq-sdk to avoid real API calls and missing GROQ_API_KEY in CI
vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ score: 85, feedback: "Good interview", skills: [] }) } }],
        }),
      },
    };
  },
}));

// Mock @clerk/express so requireAuth bypasses real Clerk auth in tests
vi.mock("@clerk/express", () => ({
  requireAuth: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: "test-user-123" };
    next();
  },
}));

const mockInterviewModel = createMockModel("Interview");

// Mock InterviewModel module
vi.mock("../models/Interview", () => ({
  InterviewModel: mockInterviewModel,
}));

// Lazy load router after mock is set up
const getInterviewRouter = async (): Promise<express.Router> => {
  const mod = await import("../routes/interview.js");
  return (mod as any).default;
};

const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuthMiddleware);
  const router = await getInterviewRouter();
  app.use("/interview", router);
  return app;
};

describe("Interview Routes", () => {
  beforeEach(() => {
    clearAllMocks();
    mockInterviewModel._clear();
  });

  describe("GET /interview/history", () => {
    it("should return empty array when no interviews exist", async () => {
      const app = await createTestApp();
      const res = await request(app).get("/interview/history");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return interviews for authenticated user", async () => {
      mockInterviewModel._store.push(
        { _id: "1", userId: mockAuthUserId, score: 85, feedback: "Good", createdAt: new Date("2024-01-02") },
        { _id: "2", userId: mockAuthUserId, score: 60, feedback: "Average", createdAt: new Date("2024-01-01") },
        { _id: "3", userId: "other_user", score: 90, feedback: "Great", createdAt: new Date("2024-01-03") },
      );

      const app = await createTestApp();
      const res = await request(app).get("/interview/history");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].score).toBe(85);
      expect(res.body[1].score).toBe(60);
    });
  });

  describe("POST /interview/end", () => {
    it("should reject missing resumeId", async () => {
      const app = await createTestApp();
      const res = await request(app)
        .post("/interview/end")
        .send({ history: [{ role: "user", text: "hello" }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("resumeId");
    });

    it("should reject empty history", async () => {
      const app = await createTestApp();
      const res = await request(app)
        .post("/interview/end")
        .send({ resumeId: "resume_123", history: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("conversation");
    });

    it("should create interview with zero score when no user messages", async () => {
      const app = await createTestApp();
      const res = await request(app)
        .post("/interview/end")
        .send({
          resumeId: "resume_123",
          history: [{ role: "model", text: "Welcome" }],
        });
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(0);
      expect(res.body.metrics).toHaveLength(4);
    });

    it("should persist interview and return id", async () => {
      const app = await createTestApp();
      const res = await request(app)
        .post("/interview/end")
        .send({
          resumeId: "resume_123",
          history: [
            { role: "model", text: "Welcome" },
            { role: "user", text: "Hello" },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(mockInterviewModel._store).toHaveLength(1);
      expect(mockInterviewModel._store[0].userId).toBe(mockAuthUserId);
      expect(mockInterviewModel._store[0].resumeId).toBe("resume_123");
    });
  });
});
