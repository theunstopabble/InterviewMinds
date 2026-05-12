import { logger } from "./logger";

export interface MobileConfig {
  version: string;
  platform: "ios" | "android" | "web";
  deviceInfo: {
    model: string;
    osVersion: string;
    appVersion: string;
  };
}

export interface MobileResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    version: string;
    locale?: string;
  };
}

export interface AppUpdate {
  required: boolean;
  latestVersion: string;
  minSupportedVersion: string;
  releaseNotes: string;
  downloadUrl: string;
}

export function validateMobileVersion(
  version: string,
  minVersion: string
): { valid: boolean; update?: AppUpdate } {
  const current = version.split(".").map(Number);
  const required = minVersion.split(".").map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (current[i] > required[i]) return { valid: true };
    if (current[i] < required[i]) {
      return {
        valid: false,
        update: {
          required: true,
          latestVersion: "2.0.0",
          minSupportedVersion: minVersion,
          releaseNotes: "Please update to continue using the app",
          downloadUrl: "https://interviewminds.com/download",
        },
      };
    }
  }
  
  return { valid: true };
}

export function formatMobileResponse<T>(
  data: T,
  options?: { locale?: string; timezone?: string }
): MobileResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      locale: options?.locale || "en-US",
    },
  };
}

export function formatMobileError(error: string, code?: string): MobileResponse {
  return {
    success: false,
    error: code ? `${code}: ${error}` : error,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
  };
}

export function optimizeForMobile<T>(data: T, options?: {
  limit?: number;
  fields?: string[];
  compress?: boolean;
}): T {
  if (options?.limit && Array.isArray(data)) {
    return data.slice(0, options.limit) as unknown as T;
  }
  
  if (options?.fields && typeof data === "object" && data !== null) {
    const filtered: Record<string, unknown> = {};
    for (const field of options.fields) {
      if (field in data) {
        filtered[field] = (data as Record<string, unknown>)[field];
      }
    }
    return filtered as unknown as T;
  }
  
  return data;
}

export function paginateMobile<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
} {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedItems = items.slice(start, end);
  
  return {
    items: paginatedItems,
    pagination: {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / pageSize),
      hasMore: end < items.length,
    },
  };
}

export interface CachePolicy {
  strategy: "cache-first" | "network-first" | "stale-while-revalidate";
  maxAge: number;
  staleWhileRevalidate?: number;
}

export function getCachePolicy(endpoint: string): CachePolicy {
  const policies: Record<string, CachePolicy> = {
    "/interview/history": { strategy: "cache-first", maxAge: 300 },
    "/questions": { strategy: "stale-while-revalidate", maxAge: 600, staleWhileRevalidate: 60 },
    "/interview/current": { strategy: "network-first", maxAge: 0 },
  };
  
  return policies[endpoint] || { strategy: "network-first", maxAge: 60 };
}

export interface MobileFeatureFlags {
  darkMode: boolean;
  offlineMode: boolean;
  biometricLogin: boolean;
  pushNotifications: boolean;
  videoCalls: boolean;
  codeEditor: boolean;
}

export function getFeatureFlags(userId: string): MobileFeatureFlags {
  return {
    darkMode: true,
    offlineMode: true,
    biometricLogin: true,
    pushNotifications: true,
    videoCalls: true,
    codeEditor: true,
  };
}

export function updateFeatureFlags(
  userId: string,
  flags: Partial<MobileFeatureFlags>
): MobileFeatureFlags {
  logger.info(`Updated feature flags for user ${userId}`);
  
  return {
    darkMode: flags.darkMode ?? true,
    offlineMode: flags.offlineMode ?? true,
    biometricLogin: flags.biometricLogin ?? true,
    pushNotifications: flags.pushNotifications ?? true,
    videoCalls: flags.videoCalls ?? true,
    codeEditor: flags.codeEditor ?? true,
  };
}

export interface AppFeedback {
  userId: string;
  rating: number;
  category: "bug" | "feature" | "improvement" | "other";
  message: string;
  deviceInfo: string;
  appVersion: string;
}

export async function submitFeedback(feedback: AppFeedback): Promise<{ feedbackId: string }> {
  logger.info(`Feedback submitted by user ${feedback.userId}: ${feedback.category}`);
  
  return {
    feedbackId: `fb_${Date.now()}`,
  };
}

export function getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string }> {
  return [
    { code: "en", name: "English", nativeName: "English" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "de", name: "German", nativeName: "Deutsch" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
    { code: "ja", name: "Japanese", nativeName: "日本語" },
    { code: "zh", name: "Chinese", nativeName: "中文" },
  ];
}

export function getTimezones(): string[] {
  return [
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];
}

export function formatDateForMobile(
  date: Date,
  locale: string,
  format: "short" | "long" | "relative"
): string {
  if (format === "relative") {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
  }
  
  return date.toLocaleDateString(locale, {
    year: format === "short" ? "2-digit" : "numeric",
    month: format === "short" ? "numeric" : "long",
    day: "numeric",
  });
}