import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock Clerk provider globally for all tests
vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "test-user-123" }),
  useUser: () => ({ isLoaded: true, user: { id: "test-user-123", fullName: "Test User" } }),
}));

// Mock Sentry for tests
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  reactRouterV6BrowserTracingIntegration: () => ({ name: "BrowserTracing", setupOnce: vi.fn() }),
}));

// Suppress console errors during tests unless explicitly needed
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
