import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "../middleware/auth";
import { Request, Response, NextFunction } from "express";

// Mock @clerk/express so requireAuth runs deterministically
vi.mock("@clerk/express", () => ({
  requireAuth: () => vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Simulate authenticated request
    (req as any).auth = { userId: "test-user-123" };
    next();
  }),
}));

describe("Auth Middleware", () => {
  const createMockReq = (): Partial<Request> => ({
    headers: {},
    cookies: {},
  });

  const createMockRes = (): Partial<Response> & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn() as unknown as NextFunction;
  });

  it("should call next when auth succeeds", () => {
    const req = createMockReq() as Request;
    const res = createMockRes() as Response;

    requireAuth(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
