import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock Clerk provider globally for all tests
vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => null,
  SignIn: () => null,
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "test-user-123" }),
  useUser: () => ({ isLoaded: true, user: { id: "test-user-123", fullName: "Test User" } }),
}));

// Mock Sentry for tests
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  reactRouterV6BrowserTracingIntegration: () => ({ name: "BrowserTracing", setupOnce: vi.fn() }),
}));

// Mock socket.io-client to prevent real WebSocket connections in tests
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

// Suppress console errors during tests unless explicitly needed
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock matchMedia for responsive components (Navbar uses it)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage for jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });
