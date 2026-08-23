import helmet from "helmet";
import rateLimit from "express-rate-limit";
import expressSanitizer from "express-sanitizer";

export const helmetMiddleware = helmet();

export const sanitizerMiddleware = expressSanitizer();

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
