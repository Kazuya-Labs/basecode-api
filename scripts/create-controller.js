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

const content = `import { eq } from "drizzle-orm";
import { Router } from "express";

import { db } from "../database/db.js";
import { users as table } from "../database/schema.js"; // TODO: swap "users" for your table
import { ok, fail } from "../lib/response.js";
import { authenticatedUser, requireRole } from "../lib/auth.js";

export const ${name}Router = Router();

${name}Router.use(authenticatedUser);

${name}Router.get("/", async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 100);
  const rows = await db
    .select()
    .from(table)
    .limit(limit)
    .offset(page * limit - limit);
  return ok(res, rows);
});

${name}Router.get("/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(table)
    .where(eq(table.id, req.params.id))
    .limit(1);
  if (!row) {
    return fail(res, 404, "${name} not found");
  }
  return ok(res, row);
});

${name}Router.post("/", requireRole("${role}"), async (req, res) => {
  const [row] = await db.insert(table).values(req.body).returning();
  return ok(res, row, "${name} created", 201);
});

${name}Router.put("/:id", requireRole("${role}"), async (req, res) => {
  const [row] = await db
    .update(table)
    .set(req.body)
    .where(eq(table.id, req.params.id))
    .returning();
  if (!row) {
    return fail(res, 404, "${name} not found");
  }
  return ok(res, row, "${name} updated");
});

${name}Router.delete("/:id", requireRole("${role}"), async (req, res) => {
  const [row] = await db.delete(table).where(eq(table.id, req.params.id)).returning();
  if (!row) {
    return fail(res, 404, "${name} not found");
  }
  return ok(res, row, "${name} deleted");
});
`;

await writeFile(targetPath, content, "utf8");

console.log(`Created ${targetPath}`);
console.log(
  `Next step: mount it in index.js with:\n  app.use("/api/${toKebabCase(name)}", ${name}Router);`,
);
