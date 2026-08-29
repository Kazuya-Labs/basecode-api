# basecode-api

Express.js API boilerplate — a secure, structured starting point for Node.js backends. Ships with `@auth/express` (JWT cookie sessions), Drizzle ORM, PostgreSQL, a hand-rolled security/CORS middleware stack, and CLI generators for controllers and middleware.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 24 (pure ESM) |
| Web framework | Express **5** |
| ORM | Drizzle ORM + drizzle-kit (`1.0.0-rc.4`) |
| Database | PostgreSQL (`pg`) |
| Auth | `@auth/express` (JWT cookie sessions) |
| Logging | pino (`LOG_LEVEL` env) |
| Security | helmet · express-rate-limit · express-sanitizer · CORS |
| Package manager | pnpm (^11.20) |

## Getting Started

```bash
# 1. Install deps (already installed if you cloned after install)
pnpm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL to your Postgres connection string
#   - generate AUTH_SECRET (min 32 chars): openssl rand -hex 32
#   - whitelist your CORS origins (comma-separated) in CORS_ORIGINS

# 3. Push the auth tables (users, accounts, sessions, verificationTokens)
pnpm db:push

# 4. Run
pnpm dev        # development (node --watch)
pnpm start      # production
```

Smoke test: `GET /api/public/health` should return a `{ success: true, ... }` envelope.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run with auto-reload (`node --watch`) |
| `pnpm start` | Run normally |
| `pnpm db:generate` | Generate a migration from the schema (drizzle-kit) |
| `pnpm db:push` | Push the schema directly to the database |
| `pnpm run create:controller <name> --role=[user\|admin]` | Scaffold a folder-based controller |
| `pnpm run create:middleware <name>` | Scaffold an Express middleware |
| `pnpm run create:reset-password` | Scaffold a password-reset (OTP via email) feature |

## Project Structure

```
index.js                     # App wiring (middleware order, auth mount, auto-router)
drizzle.config.js            # drizzle-kit config
scripts/                     # CLI generators
  create-controller.js       #   folder-based controller scaffolder
  create-middleware.js       #   middleware scaffolder
  lib/cli.js                 #   shared name/normalization helpers
src/
  controller/                # Folder-based controllers, auto-routed (see below)
    admin/                   #   guard: auth + requireRole("admin")
    user/                    #   guard: auth
    public/                  #   guard: none
  database/
    schema.js                #   Drizzle schema (auth-style tables + users.role)
    db.js                    #   drizzle instance
    crud.js                  #   generic CRUD helpers (findPage, findById, ...)
  lib/
    auth.js                  #   auth config, guards, getCurrentUser
    autoRouter.js            #   scans controller/ and mounts routers
    logger.js                #   pino logger
    response.js              #   ok() / fail() envelope helpers
  middleware/
    securityMiddleware.js    #   helmet + rate-limit + sanitizer
    corsMiddleware.js        #   hand-rolled CORS (CORS_ORIGINS whitelist)
    errorMiddleware.js       #   404 + global error handler
  utils/
    apiError.js              #   ApiError class (throw → error middleware)
    pagination.js            #   parsePagination / buildPageMeta
    index.js                 #   barrel export
```

## Folder-Based Controllers & Auto-Routing

Controllers are **folder-based and auto-routed** — you never edit `index.js` to add an endpoint.

### Convention

- **Path = URL**: `src/controller/admin/produk/index.js` → `GET /api/admin/produk`
- Each folder's `index.js` must **default-export** an Express `Router`
- Business logic lives in a co-located `service.js`; the router keeps handlers thin
- Guard scope is inferred from the **first path segment**:

| Folder | Guard |
| --- | --- |
| `admin/…` | `authenticatedUser` + `requireRole("admin")` |
| `user/…` | `authenticatedUser` |
| anything else (e.g. `public/…`) | none |

Do **not** re-add guards inside handlers — they're applied automatically on mount. Missing default export is logged and skipped at boot; a broken import fails boot.

### Add an endpoint

```bash
pnpm run create:controller produk --role=admin
# → src/controller/admin/produk/index.js  (router)
#   src/controller/admin/produk/service.js (business logic)
# auto-mounted at /api/admin/produk — restart the dev server
```

Generated `service.js` uses the generic CRUD helpers, with `// TODO: swap "users" for your table` pointing at where to bind your real table.

## Auth

- **`@auth/express`** mounted at `/auth` (captured with a RegExp so its internal path parsing works under Express 5)
- **JWT cookie sessions** (no DB session writes); `AUTH_SECRET` must be ≥ 32 chars
- Roles ride the JWT via `jwt`/`session` callbacks in `src/lib/auth.js`,
  seeded from the `users.role` column (default `'user'`)
- Guards exported from `src/lib/auth.js`:
  - `authenticatedUser` → 401 if no session
  - `requireRole("admin")` → 403 if wrong role
  - `getCurrentUser(req)` → the session user (or `null`)
- The schema is Auth.js-shaped, so a `@auth/drizzle-adapter` can be dropped in later if you want database-backed sessions

## Response Envelope

All responses follow a consistent shape:

```json
{ "success": true, "message": "…", "data": { }, "meta": { } }
```

- `ok(res, data, message, status, meta)` — success; `meta` (e.g. pagination) is added only when provided
- `fail(res, status, message, data)` — error responses
- **`ApiError`** (`src/utils/apiError.js`) — throw error-style: `throw ApiError.notFound("x")` → handled by the global error middleware (4xx logged as warn, 5xx as error)

## Utilities

- `parsePagination(query)` / `buildPageMeta(total, {page, limit})` — page/limit clamped, offset + metadata
- `src/database/crud.js`:
  - `findAll(table, {where, orderBy, limit, offset})` — builder-style, thenable & `.toSQL()`-able
  - `findPage(table, {where, page, limit})` → `{ rows, meta }` (counted via `$count`)
  - `findById` / `insertOne` / `updateById` / `deleteById`
  - Prefer these over raw queries

## Conventions

- **Pure ESM**: `import`/`export` only, never `require`
- **Express 5**: async handler errors auto-forward to the error middleware
- Identifiers/names in English
- Branch per change: `feature|bugfix|refactor/<kebab-name>`; conventional commits (e.g. `feat: …`); never commit directly to `master`

## Docker

A multi-stage `Dockerfile` (Alpine, `node:24-alpine`) is provided for running the API as a container.

```bash
# Build
docker build -t basecode-api .

# Run (single-container setup: connect to Postgres on the host, pass secrets via -e)
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:password@HOST_IP:5432/basecode \
  -e AUTH_SECRET=your-32-char-min-secret \
  basecode-api
```

Notes:

- The container runs `pnpm db:push` (pushes the schema to `DATABASE_URL`) before starting the API, so the four auth tables are created on first boot.
- Secrets (`AUTH_SECRET`, `DATABASE_URL`) come from `-e`/env — never baked into the image (see `.dockerignore`).
- `NODE_ENV=production` is set in the runtime image: morgan is disabled and 5xx error messages are hidden.
- Postgres is expected to be reachable from the container (host IP, not `localhost`). This is intentionally a single `Dockerfile` with no Compose — add one if you want orchestrated Postgres.
