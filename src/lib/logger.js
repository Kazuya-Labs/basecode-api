import pino from "pino";

/**
 * Shared application logger. Level from `LOG_LEVEL` env (default `info`).
 * @type {import("pino").Logger}
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
