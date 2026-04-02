# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM (`drizzle-orm/sqlite-core`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Dev server**: Wrangler (local D1 + Worker emulation on port 8080)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Hono Cloudflare Worker (wrangler dev, port 8080)
│   │   ├── src/
│   │   │   ├── index.ts        # Hono app entry
│   │   │   ├── types.ts        # HonoEnv type (Bindings + Variables)
│   │   │   ├── lib/auth.ts     # PBKDF2 password hashing + D1 sessions
│   │   │   └── routes/         # auth, categories, threads, posts, users
│   │   ├── migrations/
│   │   │   └── 0001_init.sql   # D1 schema + category seeds
│   │   └── wrangler.toml       # D1 binding (forum-db), port 8080
│   └── forum/              # React + Vite frontend (port from $PORT)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle SQLite schema (shared with worker)
└── scripts/
```

## Key Design Decisions

- **Cloudflare D1** replaces PostgreSQL. Schema uses `sqliteTable`, `integer().primaryKey({ autoIncrement: true })`, `text()` for timestamps (ISO 8601 strings).
- **No connection pool** in `lib/db` — the worker creates `drizzle(c.env.DB, { schema })` per request using the D1 binding from wrangler.
- **PBKDF2 (Web Crypto)** replaces bcryptjs for password hashing — native to CF Workers, no library needed. Format: `pbkdf2:sha256:100000:<saltHex>:<hashHex>`.
- **Sessions in D1** — `sessions` table with ISO string `expires_at`. Cookie name: `forum_sid`.
- **Hono** replaces Express — `c.json()`, `c.req.json()`, `c.req.param()`, `getCookie`/`setCookie` from `hono/cookie`, `createMiddleware` for auth.

## API Pattern (Orval-generated hooks)

All mutations wrap body in `{ data: values }`:
```typescript
loginMutation.mutateAsync({ data: { username, password } })
createPostMutation.mutate({ threadId, data: { content, parentPostId } })
```

## D1 Local Development

The local D1 database lives at `artifacts/api-server/.wrangler/state/v3/d1/`.
Tables + seeds are applied by the `db:init` script on every `dev` start:
```
pnpm --filter @workspace/api-server run db:init
```
To manually re-run:
```
cd artifacts/api-server && wrangler d1 execute forum-db --local --file=migrations/0001_init.sql
```

## Cloudflare Deployment

To deploy the worker to Cloudflare:
1. Create a D1 database: `wrangler d1 create forum-db`
2. Update `database_id` in `wrangler.toml` with the real ID
3. Apply migrations: `wrangler d1 migrations apply forum-db`
4. Deploy: `cd artifacts/api-server && wrangler deploy`

## Forum Features

- User registration/login (cookie-based sessions via D1)
- Forum categories (5 seeded: General Discussion, Announcements, Tech & Security, Help & Support, Off Topic)
- Threaded discussions with nested post replies (parentPostId)
- User profiles: avatar (base64), display name, bio
- Account settings page at `/account`
- Public profile pages at `/profile/:username`
