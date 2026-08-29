#!/usr/bin/env node
import path from "node:path";
import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";

const ROOT = path.resolve(".");
const AUTH_PATH = path.join(ROOT, "src/lib/auth.js");
const ENV_PATH = path.join(ROOT, ".env.example");

// Focused whitelist of common OAuth providers. Each maps to a module import
// path under "@auth/express/providers" plus the env vars Auth.js reads.
const PROVIDERS = {
  google: { label: "Google", env: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"] },
  github: { label: "GitHub", env: ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"] },
  facebook: { label: "Facebook", env: ["AUTH_FACEBOOK_ID", "AUTH_FACEBOOK_SECRET"] },
  discord: { label: "Discord", env: ["AUTH_DISCORD_ID", "AUTH_DISCORD_SECRET"] },
  gitlab: { label: "GitLab", env: ["AUTH_GITLAB_ID", "AUTH_GITLAB_SECRET"] },
};

function providerArg() {
  const arg = process.argv.find((a) => a.startsWith("--provider="));
  return arg ? arg.split("=")[1] : "";
}

function help() {
  console.log(`Usage: pnpm run create:oauth --provider=<id[,id...]>

Adds OAuth login providers to src/lib/auth.js and .env.example.
Supported providers (whitelist):

${Object.entries(PROVIDERS)
  .map(([id, p]) => `  ${id.padEnd(10)} ${p.label}  (env: ${p.env.join(", ")})`)
  .join("\n")}

Examples:
  pnpm run create:oauth --provider=google
  pnpm run create:oauth --provider=google,github,gitlab
`);
}

async function scaffold() {
  const raw = providerArg();
  if (!raw) {
    help();
    process.exit(0);
  }

  const ids = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unknown = ids.filter((id) => !PROVIDERS[id]);
  if (unknown.length) {
    console.error(
      `Unknown provider(s): ${unknown.join(", ")}. Supported: ${Object.keys(PROVIDERS).join(", ")}`,
    );
    process.exit(1);
  }

  if (!existsSync(AUTH_PATH)) {
    console.error(`Not found: ${AUTH_PATH}`);
    process.exit(1);
  }

  let auth = await readFile(AUTH_PATH, "utf8");

  for (const id of ids) {
    const { label, env } = PROVIDERS[id];
    const Pkg = id.charAt(0).toUpperCase() + id.slice(1);

    if (auth.includes(`import ${Pkg} from "@auth/express/providers/${id}";`)) {
      console.error(`Refusing to re-add "${id}": already registered in ${AUTH_PATH}`);
      continue;
    }

    auth = auth.replace(
      'import { ExpressAuth, getSession } from "@auth/express";',
      `import { ExpressAuth, getSession } from "@auth/express";\nimport ${Pkg} from "@auth/express/providers/${id}";`,
    );
    auth = auth.replace(
      "  providers: [",
      `  providers: [${Pkg}({}),`,
    );

    let envBlock = `# --- OAuth: ${label} (callback: ${"{origin}/auth/callback/" + id}) ---\n`;
    for (const varName of env) envBlock += `${varName}=\n`;
    envBlock += "\n";

    if (!(await readFile(ENV_PATH, "utf8")).includes(env[0])) {
      await appendFile(ENV_PATH, envBlock, "utf8");
    }

    console.log(`Registered ${label} OAuth provider.`);
    console.log(`  - ${AUTH_PATH}`);
    console.log(`  - ${ENV_PATH}`);
    console.log(`  - Authorized redirect URI in the ${label} console: {origin}/auth/callback/${id}`);
  }

  await writeFile(AUTH_PATH, auth, "utf8");
}

await scaffold();
