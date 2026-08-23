import { readdirSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

import { Router } from "express";

import { authenticatedUser, requireRole } from "./auth.js";
import { logger } from "./logger.js";

const CONTROLLER_ROOT = fileURLToPath(new URL("../controller", import.meta.url));

const SCOPES = {
  admin: [authenticatedUser, requireRole("admin")],
  user: [authenticatedUser],
};

function discoverControllers() {
  return readdirSync(CONTROLLER_ROOT, { recursive: true })
    .map((file) => String(file).split(path.sep).join("/"))
    .filter((file) => file.endsWith("/index.js"))
    .sort();
}

export async function buildApiRouter() {
  const apiRouter = Router();

  for (const file of discoverControllers()) {
    const moduleUrl = pathToFileURL(path.join(CONTROLLER_ROOT, file));
    const mod = await import(moduleUrl);

    if (!mod.default) {
      logger.warn({ file }, "Controller has no default export, skipping");
      continue;
    }

    const routePath = "/" + file.slice(0, -"/index.js".length);
    const [scope] = file.split("/");
    const guards = SCOPES[scope] ?? [];

    apiRouter.use(routePath, ...guards, mod.default);
    logger.debug({ routePath }, "Controller mounted");
  }

  return apiRouter;
}
