#!/usr/bin/env node
import path from "node:path";
import { writeFile } from "node:fs/promises";

import {
  ensureNotExists,
  normalizeComponentName,
  toKebabCase,
} from "./lib/cli.js";

const [nameArg, ...flags] = process.argv.slice(2);
const commandLabel = "create:controller <name> --role=[user|admin]";

const name = normalizeComponentName(nameArg, commandLabel);

const roleArg = flags.find((flag) => flag.startsWith("--role="));
const role = roleArg ? roleArg.split("=")[1] : "user";
if (!["user", "admin"].includes(role)) {
  console.error(`Invalid --role "${role}". Allowed values: user, admin.`);
  process.exit(1);
}

const targetPath = path.resolve("src/controller", `${name}Controller.js`);
ensureNotExists(targetPath, "controller");

const content = `import { Router } from "express";

import { deleteById, findPage, findById, insertOne, updateById } from "../database/crud.js";
import { users as table } from "../database/schema.js"; // TODO: swap "users" for your table
import { authenticatedUser, requireRole } from "../lib/auth.js";
import { ok } from "../lib/response.js";
import { ApiError, parsePagination } from "../utils/index.js";

export const ${name}Router = Router();

${name}Router.use(authenticatedUser);

${name}Router.get("/", async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { rows, meta } = await findPage(table, { page, limit });
  return ok(res, rows, "${name} list", 200, meta);
});

${name}Router.get("/:id", async (req, res) => {
  const row = await findById(table, req.params.id);
  if (!row) throw ApiError.notFound("${name} not found");
  return ok(res, row);
});

${name}Router.post("/", requireRole("${role}"), async (req, res) => {
  const row = await insertOne(table, req.body);
  return ok(res, row, "${name} created", 201);
});

${name}Router.put("/:id", requireRole("${role}"), async (req, res) => {
  const row = await updateById(table, req.params.id, req.body);
  if (!row) throw ApiError.notFound("${name} not found");
  return ok(res, row, "${name} updated");
});

${name}Router.delete("/:id", requireRole("${role}"), async (req, res) => {
  const row = await deleteById(table, req.params.id);
  if (!row) throw ApiError.notFound("${name} not found");
  return ok(res, row, "${name} deleted");
});
`;

await writeFile(targetPath, content, "utf8");

console.log(`Created ${targetPath}`);
console.log(
  `Next step: mount it in index.js with:\n  app.use("/api/${toKebabCase(name)}", ${name}Router);`,
);
