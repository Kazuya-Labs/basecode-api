import "dotenv/config";

import morgan from "morgan";
import express from "express";

import { authHandler } from "./src/lib/auth.js";
import { logger } from "./src/lib/logger.js";
import { healthRouter } from "./src/controller/healthController.js";
import { corsMiddleware } from "./src/middleware/corsMiddleware.js";
import {
  apiRateLimiter,
  helmetMiddleware,
  sanitizerMiddleware,
} from "./src/middleware/securityMiddleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./src/middleware/errorMiddleware.js";

const app = express();

// Trust exactly one proxy hop; "true" trips express-rate-limit's permissive-trust-proxy check
app.set("trust proxy", 1);

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizerMiddleware);

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Capturing-group regex instead of "/auth/*splat": @auth/express reads req.params[0]
// (numeric), which Express 5 only fills for RegExp routes
app.use(/^\/auth(\/.*)/, authHandler);

app.use("/api", apiRateLimiter);
app.use("/api/health", healthRouter);

// Mount generated controllers here, e.g.:
// app.use("/api/users", usersRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  logger.info({ port }, `Server listening on port ${port}`);
});
