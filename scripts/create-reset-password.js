#!/usr/bin/env node
import path from "node:path";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";

const ROOT = path.resolve(".");
const SCHEMA_PATH = path.join(ROOT, "src/database/schema.js");
const MAILER_PATH = path.join(ROOT, "src/lib/mailer.js");
const CTRL_DIR = path.join(ROOT, "src/controller/public/reset-password");
const INDEX_PATH = path.join(CTRL_DIR, "index.js");
const SERVICE_PATH = path.join(CTRL_DIR, "service.js");
const ENV_PATH = path.join(ROOT, ".env.example");

for (const [file, kind] of [
  [INDEX_PATH, "controller index"],
  [SERVICE_PATH, "controller service"],
]) {
  if (existsSync(file)) {
    console.error(`Refusing to overwrite existing ${kind}: ${file}`);
    process.exit(1);
  }
}

await mkdir(CTRL_DIR, { recursive: true });

// ---- 1. Schema: users.password column + password_reset_tokens table ----
let schema = await readFile(SCHEMA_PATH, "utf8");

if (!schema.includes("password:")) {
  schema = schema.replace(
    "  role: text(\"role\").notNull().default(\"user\"),\n",
    "  role: text(\"role\").notNull().default(\"user\"),\n  password: text(\"password\"), // scrypt hash, set via reset-password\n",
  );
}

if (!schema.includes("password_reset_tokens")) {
  schema += `
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(), // SHA-256 of the OTP code
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});
`;
}
await writeFile(SCHEMA_PATH, schema, "utf8");

// ---- 2. Mailer ----
const mailerContent = `import nodemailer from "nodemailer";

/**
 * Nodemailer transporter built from SMTP_* env vars.
 * Returns null when SMTP_HOST is unset (dev mode: log instead of sending).
 */
export const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

/** @returns {Promise<void>} */
export async function sendEmail(to, subject, text) {
  const from = process.env.SMTP_FROM ?? "noreply@localhost";
  if (!transporter) {
    console.log(\`[mailer] SMTP_HOST unset, not sending:\\n  to=\${to} subject=\${subject}\\n  body=\${text}\`);
    return;
  }
  await transporter.sendMail({ from, to, subject, text });
}
`;
await writeFile(MAILER_PATH, mailerContent, "utf8");

// ---- 3. Service ----
const serviceContent = `import {
  createHash,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

import { and, asc, eq } from "drizzle-orm";

import { db } from "../../../database/db.js";
import { passwordResetTokens, users } from "../../../database/schema.js";
import { ApiError } from "../../../utils/index.js";
import { sendEmail } from "../../../lib/mailer.js";

const scryptAsync = promisify(scrypt);
const CODE_TTL_MS = (Number(process.env.RESET_CODE_TTL) || 15) * 60 * 1000;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Hash an OTP code for storage. */
function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

/** scrypt-hash a plaintext password (salt:password format). */
async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scryptAsync(password, salt, 64);
  return \`scrypt:\${salt}:\${derived.toString("hex")}\`;
}

async function verifyPassword(password, stored) {
  const [scheme, salt, hashHex] = String(stored ?? "").split(":");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;
  const derived = await scryptAsync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hashHex, "hex"), derived);
}

async function findUserByEmail(email) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, String(email ?? "").toLowerCase()))
    .limit(1);
  return row ?? null;
}

/**
 * Request a reset code: create a 6-digit OTP, store its hash, email it.
 * Always responds successfully even if the email is unknown (avoids leak).
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function requestReset(email) {
  const user = await findUserByEmail(email);
  if (!user) return;

  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  await sendEmail(
    user.email,
    "Password reset code",
    [
      \`Your password reset code is: \${code}\`,
      \`It expires in \${Math.round(CODE_TTL_MS / 60000)} minutes.\`,
      \`Enter it at \${APP_URL}/reset-password/verify\`,
    ].join("\\n"),
  );
}

/**
 * Verify code + set a new password. Rejects on unknown user, bad/expired/used
 * code, or invalid password.
 * @param {string} email
 * @param {string} code
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function verifyAndReset(email, code, newPassword) {
  if (!newPassword || String(newPassword).length < 8) {
    throw ApiError.badRequest("New password must be at least 8 characters");
  }

  const user = await findUserByEmail(email);
  if (!user) throw ApiError.badRequest("Invalid code or email");

  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, user.id)))
    .orderBy(asc(passwordResetTokens.expiresAt))
    .limit(10);

  const match = token
    ? token.tokenHash === hashCode(String(code)) &&
      token.expiresAt.getTime() > Date.now()
    : false;
  if (!match) throw ApiError.badRequest("Invalid or expired code");

  const passwordHash = await hashPassword(String(newPassword));
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, user.id));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, token.id));
}

/**
 * Verify a stored password against a plaintext value.
 * @param {string} password
 * @param {string} stored scrypt hash
 * @returns {Promise<boolean>}
 */
export { verifyPassword };
`;
await writeFile(SERVICE_PATH, serviceContent, "utf8");

// ---- 4. Controller index ----
const indexContent = `import { Router } from "express";

import { ok } from "../../../lib/response.js";
import { requestReset, verifyAndReset } from "./service.js";

const router = Router();

router.post("/request", async (req, res) => {
  await requestReset(req.body.email);
  return ok(res, null, "If that email exists, a reset code has been sent");
});

router.post("/verify", async (req, res) => {
  await verifyAndReset(req.body.email, req.body.code, req.body.newPassword);
  return ok(res, null, "Password has been reset");
});

export default router;
`;
await writeFile(INDEX_PATH, indexContent, "utf8");

// ---- 5. .env.example: append SMTP block if missing ----
const env = await readFile(ENV_PATH, "utf8");
if (!env.includes("SMTP_HOST")) {
  const block = `
# --- Reset password (SMTP) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@localhost
# Public app URL used in reset emails
APP_URL=http://localhost:3000
# Reset code validity in minutes
RESET_CODE_TTL=15
`;
  await appendFile(ENV_PATH, block, "utf8");
}

console.log(`Created reset-password feature at src/controller/public/reset-password/`);
console.log(`- ${path.relative(ROOT, MAILER_PATH)}`);
console.log(`- ${path.relative(ROOT, INDEX_PATH)}`);
console.log(`- ${path.relative(ROOT, SERVICE_PATH)}`);
console.log(`Updated ${path.relative(ROOT, SCHEMA_PATH)} (users.password + password_reset_tokens)`);
console.log(`Updated ${path.relative(ROOT, ENV_PATH)} (SMTP settings)`);
console.log("Next steps:");
console.log("  1. Set SMTP_*/APP_URL in .env");
console.log("  2. Run: pnpm db:push   (adds password_reset_tokens + users.password)");
console.log("  3. Restart the dev server. Endpoints: POST /api/public/reset-password/request and /verify");
