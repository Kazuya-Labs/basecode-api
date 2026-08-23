import { existsSync } from "node:fs";

export function normalizeComponentName(raw, commandLabel) {
  const value = String(raw ?? "").trim();
  if (!value) {
    console.error(`Usage: pnpm run ${commandLabel} <name>`);
    process.exit(1);
  }

  const parts = value
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter(Boolean);
  const camel = parts
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");

  if (!/^[a-z][a-zA-Z0-9]*$/.test(camel)) {
    console.error(
      `Invalid name "${value}". Use letters and numbers only, e.g. "user-profile" or "userProfile".`,
    );
    process.exit(1);
  }

  return camel;
}

export function toKebabCase(camel) {
  return camel.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function ensureNotExists(filePath, kind) {
  if (existsSync(filePath)) {
    console.error(`Refusing to overwrite existing ${kind}: ${filePath}`);
    process.exit(1);
  }
}
