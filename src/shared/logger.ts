import { pino } from "pino";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Shared async JSON logger (Protocol 4).
 * Levels in prod: info | warn | error only. debug is dev-only.
 * PII is redacted centrally — never log raw emails, tokens or bodies.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.secret",
      "*.email",
      "*.authorization",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  base: {
    service: "lms-platform",
    env: process.env.NODE_ENV ?? "development",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
