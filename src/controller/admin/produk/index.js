import { Router } from "express";

import { ok } from "../../../lib/response.js";
import { ApiError, parsePagination } from "../../../utils/index.js";
import * as produkService from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const pagination = parsePagination(req.query);
  const { rows, meta } = await produkService.listProduk(pagination);
  return ok(res, rows, "produk list", 200, meta);
});

router.get("/:id", async (req, res) => {
  const row = await produkService.getProduk(req.params.id);
  if (!row) throw ApiError.notFound("produk not found");
  return ok(res, row);
});

router.post("/", async (req, res) => {
  const row = await produkService.createProduk(req.body);
  return ok(res, row, "produk created", 201);
});

router.put("/:id", async (req, res) => {
  const row = await produkService.updateProduk(req.params.id, req.body);
  if (!row) throw ApiError.notFound("produk not found");
  return ok(res, row, "produk updated");
});

router.delete("/:id", async (req, res) => {
  const row = await produkService.removeProduk(req.params.id);
  if (!row) throw ApiError.notFound("produk not found");
  return ok(res, row, "produk deleted");
});

export default router;
