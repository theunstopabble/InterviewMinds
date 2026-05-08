import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
  base: {
    service: "interview-minds-api",
    version: process.env.npm_package_version || "1.0.0",
  },
});

export const getRequestLogger = (correlationId: string, userId?: string) => {
  return logger.child({
    correlationId,
    userId,
  });
};
