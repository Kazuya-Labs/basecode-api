import { logger } from "../lib/logger.js";
import { fail } from "../lib/response.js";

export function notFoundMiddleware(req, res) {
  return fail(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorMiddleware(err, req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500) {
    logger.error({ err, method: req.method, url: req.originalUrl }, "Unhandled error");
  } else {
    logger.warn(
      { status, msg: err.message, method: req.method, url: req.originalUrl },
      "Request failed",
    );
  }

  const message =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;

  return fail(res, status, message);
}
