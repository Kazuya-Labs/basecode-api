#!/usr/bin/env node
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import {
  ensureNotExists,
  normalizeComponentName,
  toKebabCase,
  toPascalCase,
} from "./lib/cli.js";

const [nameArg, ...flags] = process.argv.slice(2);
const commandLabel = "create:controller <name> --role=[user|admin]";

const name = normalizeComponentName(nameArg, commandLabel);
const Pascal = toPascalCase(name);

const roleArg = flags.find((flag) => flag.startsWith("--role="));
const role = roleArg ? roleArg.split("=")[1] : "user";
if (!["user", "admin"].includes(role)) {
  console.error(`Invalid --role "${role}". Allowed values: user, admin.`);
  process.exit(1);
}

const targetDir = path.resolve("src/controller", role, name);
ensureNotExists(path.join(targetDir, "index.js"), "controller");
await mkdir(targetDir, { recursive: true });

const indexContent = `import { Router } from "express";

import { ok } from "../../../lib/response.js";
import { ApiError, parsePagination } from "../../../utils/index.js";
import * as ${name}Service from "./service.js";

const router = Router();

router.get("/", async (req, res) => {
  const pagination = parsePagination(req.query);
  const { rows, meta } = await ${name}Service.list${Pascal}(pagination);
  return ok(res, rows, "${name} list", 200, meta);
});

router.get("/:id", async (req, res) => {
  const row = await ${name}Service.get${Pascal}(req.params.id);
  if (!row) throw ApiError.notFound("${name} not found");
  return ok(res, row);
});

router.post("/", async (req, res) => {
  const row = await ${name}Service.create${Pascal}(req.body);
  return ok(res, row, "${name} created", 201);
});

router.put("/:id", async (req, res) => {
  const row = await ${name}Service.update${Pascal}(req.params.id, req.body);
  if (!row) throw ApiError.notFound("${name} not found");
  return ok(res, row, "${name} updated");
});

router.delete("/:id", async (req, res) => {
  const row = await ${name}Service.remove${Pascal}(req.params.id);
  if (!row) throw ApiError.notFound("${name} not found");
  return ok(res, row, "${name} deleted");
});

export default router;
`;

const serviceContent = `import {
  deleteById,
  findPage,
  findById,
  insertOne,
  updateById,
} from "../../../database/crud.js";
import { users as table } from "../../../database/schema.js"; // TODO: swap "users" for your table

export function list${Pascal}({ page, limit }) {
  // Add business rules here (filters, ordering, scoping)
  return findPage(table, { page, limit });
}

export function get${Pascal}(id) {
  return findById(table, id);
}

export function create${Pascal}(data) {
  // Validate / transform input before persisting
  return insertOne(table, data);
}

export function update${Pascal}(id, data) {
  return updateById(table, id, data);
}

export function remove${Pascal}(id) {
  return deleteById(table, id);
}
`;

await writeFile(path.join(targetDir, "index.js"), indexContent, "utf8");
await writeFile(path.join(targetDir, "service.js"), serviceContent, "utf8");

console.log(`Created ${path.join(targetDir, "index.js")}`);
console.log(`Created ${path.join(targetDir, "service.js")}`);
console.log(
  `Auto-mounted at /api/${role}/${toKebabCase(name)} — restart the dev server to pick it up.`,
);
