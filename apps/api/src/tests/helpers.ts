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

function makeChainable(results: any[]) {
  const chain = {
    select: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    lean: vi.fn(() => Promise.resolve(results)),
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(results).then(onFulfilled, onRejected),
  };
  return chain;
}

export const createMockModel = (modelName: string) => {
  if (!mockStore.has(modelName)) {
    mockStore.set(modelName, []);
  }
  const store = mockStore.get(modelName)!;

  const Model = function (this: any, data: any) {
    Object.assign(this, data);
    this._id = data._id || `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.save = () => {
      store.push(this);
      return Promise.resolve(this);
    };
  } as any;

  Model.find = vi.fn((query: any = {}) => {
    const results = store.filter((doc) => {
      for (const key in query) {
        if (doc[key] !== query[key]) return false;
      }
      return true;
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return makeChainable(results);
  });

  Model.findById = vi.fn((id: string) => {
    const doc = store.find((d) => d._id === id || d.id === id);
    return Promise.resolve(doc || null);
  });

  Model.findByIdAndUpdate = vi.fn((id: string, update: any) => {
    const idx = store.findIndex((d) => d._id === id || d.id === id);
    if (idx >= 0) {
      Object.assign(store[idx], update);
      return Promise.resolve(store[idx]);
    }
    return Promise.resolve(null);
  });

  Model.findOne = vi.fn((query: any = {}) => {
    const doc = store.find((d) => {
      for (const key in query) {
        if (d[key] !== query[key]) return false;
      }
      return true;
    });
    return Promise.resolve(doc || null);
  });

  Model.deleteMany = vi.fn(() => {
    store.length = 0;
    return Promise.resolve({ deletedCount: 0 });
  });

  Model.countDocuments = vi.fn((query: any = {}) => {
    return Promise.resolve(
      store.filter((doc) => {
        for (const key in query) {
          if (doc[key] !== query[key]) return false;
        }
        return true;
      }).length,
    );
  });

  Model.create = vi.fn((data: any) => {
    const doc = new Model(data);
    store.push(doc);
    return Promise.resolve(doc);
  });

  Model._store = store;
  Model._clear = () => {
    store.length = 0;
  };

  return Model;
};

export const clearAllMocks = () => {
  mockStore.clear();
};
