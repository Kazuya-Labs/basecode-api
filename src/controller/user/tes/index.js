import { Router } from "express";

import { ok } from "../../../lib/response.js";
import { ApiError, parsePagination } from "../../../utils/index.js";
import * as tesService from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const pagination = parsePagination(req.query);
  const { rows, meta } = await tesService.listTes(pagination);
  return ok(res, rows, "tes list", 200, meta);
});

router.get("/:id", async (req, res) => {
  const row = await tesService.getTes(req.params.id);
  if (!row) throw ApiError.notFound("tes not found");
  return ok(res, row);
});

router.post("/", async (req, res) => {
  const row = await tesService.createTes(req.body);
  return ok(res, row, "tes created", 201);
});

router.put("/:id", async (req, res) => {
  const row = await tesService.updateTes(req.params.id, req.body);
  if (!row) throw ApiError.notFound("tes not found");
  return ok(res, row, "tes updated");
});

router.delete("/:id", async (req, res) => {
  const row = await tesService.removeTes(req.params.id);
  if (!row) throw ApiError.notFound("tes not found");
  return ok(res, row, "tes deleted");
});

export default router;
