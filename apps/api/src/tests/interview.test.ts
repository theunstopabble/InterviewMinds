import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { mockAuthMiddleware, mockAuthUserId } from "./helpers";

// Set mock API key before any module loads it
process.env.GROQ_API_KEY = "mock-groq-key-for-tests";

// Mock groq-sdk to avoid real API calls
vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 85,
                feedback: "Good interview",
                skills: [
                  { subject: "Content Quality", A: 85, fullMark: 100 },
                  { subject: "Communication Skills", A: 80, fullMark: 100 },
                  { subject: "Behavioral Indicators", A: 75, fullMark: 100 },
                  { subject: "Domain Expertise", A: 90, fullMark: 100 },
                ],
              }),
            },
          }],
        }),
      },
    };
  },
}));

// Mock @clerk/express so requireAuth bypasses real Clerk auth in tests
vi.mock("@clerk/express", () => ({
  requireAuth: () => (req: any, _res: any, next: any) => {
    req.auth = { userId: mockAuthUserId };
    next();
  },
}));

// Self-contained InterviewModel mock — no external variables to avoid hoisting issues
const store: any[] = [];

function makeChainable(results: any[]) {
  return {
    select: () => makeChainable(results),
    sort: () => makeChainable(results),
    lean: () => Promise.resolve(results),
    then: (onF: any, onR: any) => Promise.resolve(results).then(onF, onR),
  };
}

function MockModel(this: any, data: any) {
  Object.assign(this, data);
  this._id = data._id || `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  this.save = () => {
    store.push(this);
    return Promise.resolve(this);
  };
}

(MockModel as any).find = () => makeChainable([...store]);
(MockModel as any).findById = (id: string) => Promise.resolve(store.find((d: any) => d._id === id) || null);
(MockModel as any).findOne = (query: any) => Promise.resolve(store.find((d: any) => {
  for (const k in query) if (d[k] !== query[k]) return false;
  return true;
}) || null);
(MockModel as any).findByIdAndUpdate = (id: string, update: any) => {
  const idx = store.findIndex((d: any) => d._id === id);
  if (idx >= 0) {
    Object.assign(store[idx], update);
    return Promise.resolve(store[idx]);
  }
  return Promise.resolve(null);
};
(MockModel as any).create = (data: any) => {
  const doc = new (MockModel as any)(data);
  store.push(doc);
  return Promise.resolve(doc);
};
(MockModel as any).deleteMany = () => {
  store.length = 0;
  return Promise.resolve({ deletedCount: 0 });
};
(MockModel as any).countDocuments = () => Promise.resolve(store.length);
(MockModel as any)._store = store;
(MockModel as any)._clear = () => { store.length = 0; };

vi.mock("../models/Interview", () => ({
  InterviewModel: MockModel,
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
    (MockModel as any)._clear();
  });

  describe("GET /interview/history", () => {
    it("should return empty array when no interviews exist", async () => {
      const app = await createTestApp();
      const res = await request(app).get("/interview/history");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return interviews for authenticated user", async () => {
      (MockModel as any)._store.push(
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
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toContain("resumeId: Required");
    });

    it("should reject empty history", async () => {
      const app = await createTestApp();
      const res = await request(app)
        .post("/interview/end")
        .send({ resumeId: "resume_123", history: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details).toContain("history: At least one message is required");
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
      expect((MockModel as any)._store).toHaveLength(1);
      expect((MockModel as any)._store[0].userId).toBe(mockAuthUserId);
      expect((MockModel as any)._store[0].resumeId).toBe("resume_123");
    });
  });
});
