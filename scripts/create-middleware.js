#!/usr/bin/env node
import path from "node:path";
import { writeFile } from "node:fs/promises";

import { ensureNotExists, normalizeComponentName } from "./lib/cli.js";

const name = normalizeComponentName(process.argv[2], "create:middleware <name>");

const targetPath = path.resolve("src/middleware", `${name}Middleware.js`);
ensureNotExists(targetPath, "middleware");

const content = `export function ${name}Middleware(req, res, next) {
  // TODO: implement middleware logic
  next();
}
`;

await writeFile(targetPath, content, "utf8");

console.log(`Created ${targetPath}`);
console.log(`Next step: apply it in index.js with app.use(${name}Middleware);`);
