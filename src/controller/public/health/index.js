import os from "node:os";

import { Router } from "express";

import { ok } from "../../../lib/response.js";

const router = Router();

router.get("/", (_req, res) => {
  return ok(
    res,
    {
      status: "ok",
      uptime: process.uptime(),
      hostname: os.hostname(),
      timestamp: new Date().toISOString(),
    },
    "Service healthy",
  );
});

export default router;
