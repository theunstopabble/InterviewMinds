import express from "express";
import { vi } from "vitest";

export const mockAuthUserId = "user_test_123";

export const mockAuthMiddleware = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
) => {
  (req as any).auth = { userId: mockAuthUserId };
  next();
};

// In-memory store for mock DB operations
const mockStore: Map<string, any[]> = new Map();

export const createMockModel = (modelName: string) => {
  if (!mockStore.has(modelName)) {
    mockStore.set(modelName, []);
  }
  const store = mockStore.get(modelName)!;

  return {
    find: vi.fn((query: any = {}) => {
      const results = store.filter((doc) => {
        for (const key in query) {
          if (doc[key] !== query[key]) return false;
        }
        return true;
      });
      return Promise.resolve(
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      );
    }),
    findById: vi.fn((id: string) => {
      const doc = store.find((d) => d._id === id || d.id === id);
      return Promise.resolve(doc || null);
    }),
    findByIdAndUpdate: vi.fn((id: string, update: any) => {
      const idx = store.findIndex((d) => d._id === id || d.id === id);
      if (idx >= 0) {
        Object.assign(store[idx], update);
        return Promise.resolve(store[idx]);
      }
      return Promise.resolve(null);
    }),
    findOne: vi.fn((query: any = {}) => {
      const doc = store.find((d) => {
        for (const key in query) {
          if (d[key] !== query[key]) return false;
        }
        return true;
      });
      return Promise.resolve(doc || null);
    }),
    save: vi.fn(function (this: any) {
      if (!this._id) this._id = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      store.push(this);
      return Promise.resolve(this);
    }),
    deleteMany: vi.fn(() => {
      store.length = 0;
      return Promise.resolve({ deletedCount: 0 });
    }),
    countDocuments: vi.fn((query: any = {}) => {
      return Promise.resolve(
        store.filter((doc) => {
          for (const key in query) {
            if (doc[key] !== query[key]) return false;
          }
          return true;
        }).length,
      );
    }),
    // For constructor-style creation
    create: vi.fn((data: any) => {
      const doc = {
        _id: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ...data,
        save: function () {
          store.push(this);
          return Promise.resolve(this);
        },
      };
      return doc;
    }),
    _store: store,
    _clear: () => {
      store.length = 0;
    },
  };
};

export const clearAllMocks = () => {
  mockStore.clear();
};
