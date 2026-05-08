import * as Sentry from "@sentry/node";
import { logger } from "./logger";

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENV = process.env.NODE_ENV || "development";

export function initSentry(): void {
  if (!SENTRY_DSN) {
    logger.warn("SENTRY_DSN not set — Sentry disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    tracesSampleRate: ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: ENV === "production" ? 0.05 : 1.0,
    integrations: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeSend(event: any) {
      // Strip sensitive data before sending to Sentry
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = "[REDACTED]";
      }
      if (event.request?.cookies) {
        event.request.cookies = "[REDACTED]";
      }
      return event;
    },
  });

  logger.info("Sentry initialized");
}

export function captureException(err: Error, context?: Record<string, unknown>): void {
  if (SENTRY_DSN) {
    Sentry.captureException(err, { extra: context });
  }
}
