# Testing

This monorepo uses **Vitest** for unit + integration testing inside packages,
and **Playwright** at the repo root for browser/HTTP end-to-end smoke tests.

The split is roughly **40 / 40 / 20** (unit / integration / e2e) by file count
and is structured so each tier is fast, focused, and runnable in isolation.

---

## Quick start

```bash
# All Vitest tiers in @workspace/api-server
pnpm --filter @workspace/api-server test

# Per-tier (Vitest projects)
pnpm --filter @workspace/api-server run test:unit
pnpm --filter @workspace/api-server run test:integration
pnpm --filter @workspace/api-server run test:e2e

# Schema regression on @workspace/db
pnpm --filter @workspace/db test

# Browser-driven E2E (Playwright)
pnpm --filter @workspace/playwright-e2e exec playwright install --with-deps chromium  # one-time
pnpm --filter @workspace/playwright-e2e test
```

The root convenience scripts run everything in CI-friendly order:

```bash
pnpm test               # vitest tiers across api-server + lib/db
pnpm test:unit          # api-server unit tier
pnpm test:integration   # api-server integration tier
pnpm test:server-e2e    # api-server vitest cross-route e2e tier (no browser)
pnpm test:e2e           # browser-driven Playwright tier (canonical E2E)
pnpm test:browser       # alias of test:e2e
```

`pnpm test:e2e` requires Chromium to be installed once per environment:

```bash
pnpm --filter @workspace/playwright-e2e run test:install
# equivalent: pnpm --filter @workspace/playwright-e2e exec playwright install --with-deps chromium
```

This is a **one-time bootstrap** per machine (or CI cache key); subsequent
`pnpm test:e2e` runs reuse the installed browser.

### What `pnpm test:e2e` actually does

`playwright.config.ts` declares a two-process `webServer` block that boots the
backend and frontend before the suite runs:

| Process | Command | Wait URL |
| --- | --- | --- |
| API server | `pnpm --filter @workspace/api-server run dev` (PORT=8080) | `http://localhost:80/api/healthz` |
| Frontend (Vite) | `pnpm --filter @workspace/social-meta-collector run dev` (PORT=24982, BASE_PATH=/) | `http://localhost:80/` |

Both wait URLs go through the platform's path-based proxy on `:80`, which is
how the registered artifact services are normally reached. With
`reuseExistingServer: true` (the default outside CI), Playwright will piggy-back
on the workflows that the Replit workspace already keeps running — no extra
processes are spawned. In CI (`CI=1`), Playwright owns the lifecycle and will
fail fast if either service does not become healthy within 180 s.

### Targeting an already-running deployment

Set any of the following to skip the `webServer` block and point Playwright at
an existing URL:

```bash
# Live Replit preview (auto-detected when REPLIT_DEV_DOMAIN is set)
pnpm --filter @workspace/playwright-e2e run test:remote

# Arbitrary base URL (production smoke)
PLAYWRIGHT_BASE_URL=https://example.com pnpm test:e2e

# Force-skip the webServer even on localhost (e.g. you're running workflows by hand)
PLAYWRIGHT_SKIP_WEBSERVER=1 pnpm test:e2e
```

By default the Playwright suite targets `http://localhost:80` (the in-workspace
proxy fronting the artifact services). To point it at any other URL —
including the live Replit preview at `https://$REPLIT_DEV_DOMAIN` or a
production domain — set `PLAYWRIGHT_BASE_URL` (the convenience
`pnpm --filter @workspace/playwright-e2e run test:remote` script defaults it
to `https://$REPLIT_DEV_DOMAIN`).

---

## Layout

```
artifacts/api-server/
├── tests/
│   ├── setup/
│   │   └── integration-setup.ts       # runs after each integration test
│   ├── utils/
│   │   ├── db-chain.ts                # drizzle-style awaitable chain helpers
│   │   ├── test-app.ts                # buildTestApp() — Express w/ pino-http
│   │   └── auth-headers.ts            # bearerForUser(...) for /me, etc.
│   ├── fixtures/
│   │   ├── users.ts                   # makeUser() with bcrypt hash
│   │   └── tokens.ts                  # makeToken() with encrypted accessToken
│   ├── mocks/
│   │   ├── db.ts                      # re-exports chain helpers
│   │   ├── redis.ts                   # FakeRedis + installRedisMock()
│   │   └── bullmq.ts                  # in-memory Queue/Worker w/ retry drain
│   ├── unit/                          # ~7 specs — pure functions, no IO
│   │   ├── auth/{jwt,bcrypt,encryption}.test.ts
│   │   ├── providers/{youtube,meta}.provider.test.ts
│   │   ├── cache/redis-cache.test.ts
│   │   └── validation/schemas.test.ts
│   ├── integration/                   # ~12 specs — supertest + mocked db
│   │   ├── auth/{login,register}.test.ts
│   │   ├── auth/oauth/{youtube,instagram,facebook}-oauth.test.ts
│   │   ├── dashboard/{summary,engagement,cache-behavior}.test.ts
│   │   ├── metadata/fetch-metadata.test.ts
│   │   ├── queue/{job-processing,retry}.test.ts
│   │   └── webhooks/meta-webhook.test.ts
│   └── e2e/                           # ~3 specs — multi-route, vitest
│       ├── auth.flow.test.ts
│       ├── dashboard.flow.test.ts
│       └── oauth.flow.test.ts
└── vitest.config.ts                   # 3 projects: unit / integration / e2e

lib/db/
├── tests/
│   ├── schema.test.ts                 # column + table-name assertions
│   └── migrations.test.ts             # live-DB introspection: tables + NOT NULL parity
└── vitest.config.ts

playwright/
├── playwright.config.ts
├── fixtures/test-user.ts              # makeTestUser, registerAndLogin fixture
├── specs/
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── connections.spec.ts
└── package.json                       # @workspace/playwright-e2e
```

---

## Philosophy

| Tier        | Boundary mocked     | What it proves                                  |
| ----------- | ------------------- | ----------------------------------------------- |
| Unit        | Everything but pure | A function does what it claims for its inputs.  |
| Integration | DB (`@workspace/db`), Redis, BullMQ, network (`fetch`) | A route/queue handler wired through real Express + Zod parses requests, returns the right envelope, and gracefully degrades when an external system is down. |
| E2E         | Same as integration but composed across multiple routes | A user journey (register → login → /me) works end-to-end through the same Express stack a deployed server uses. |
| Playwright  | Nothing — black-box | A live API server (Vite preview / deployed app) responds to public HTTP traffic correctly. |

### Two non-negotiable invariants we test

1.  **OAuth tokens are never persisted in plaintext.** AES-256-GCM encryption is
    asserted to roundtrip, fail closed on tamper, and refuse a wrong-length key.
    Token storage tests assert the stored `accessToken` is a base64url ciphertext.
2.  **Redis is optional, never load-bearing.** The cache helpers (`cacheGet`,
    `cacheSet`, `cacheDel`) are asserted to swallow any client error, and the
    `dashboard/summary` route is exercised with `REDIS_URL` unset to confirm the
    response still includes the full payload (`X-Cache: MISS`).

---

## Conventions

### File naming

* Unit + integration + e2e specs always end in `.test.ts`.
* Playwright specs end in `.spec.ts` (Playwright's convention) and live under
  `playwright/specs/`.

### Mocking the database

The integration tests mock `@workspace/db` per file using `vi.mock(...)` with a
factory that closes over a small in-memory store. The chain helpers in
`tests/utils/db-chain.ts` produce awaitable Drizzle-shaped chains:

```ts
vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(store.users),
      insert: () => insertChain<User>((rows) => store.users.push(...rows)),
    },
  };
});
```

This avoids spinning up a Postgres container per test while still exercising
the route's full parse → handler → serializer flow. If a test ever needs SQL
semantics (joins, RETURNING with conflict handling, etc.), promote it to a
Playwright spec against a live database.

### Mocking outbound HTTP

Use `installFetchMock({ routes })` from `src/test/fetchMock.ts` (already part of
the codebase). It captures every `fetch()` call so you can assert URLs were
visited, and lets you respond per-route with status, body, and content-type.

### Mocking Redis / BullMQ

* Pure cache logic → `tests/mocks/redis.ts` `installRedisMock()` (or rely on
  `delete process.env.REDIS_URL` for the "Redis is unavailable" branch).
* Queue handlers → `tests/mocks/bullmq.ts` `installBullmqMock()` exposes a
  `drain()` helper that emulates BullMQ's `attempts`+exponential-backoff retry.

### Required environment

The Vitest setup file (`src/test/setup.ts`) seeds these for every test:

| Var             | Purpose                                          |
| --------------- | ------------------------------------------------ |
| `TOKEN_SECRET`  | 32-byte hex key for AES-256-GCM token encryption |
| `JWT_SECRET`    | HMAC secret for JWT signing/verifying            |
| `DATABASE_URL`  | Set to a sentinel value; the `db` import is mocked|
| `NODE_ENV=test` |                                                  |

`REDIS_URL` and `YOUTUBE_API_KEY` are deleted by default so the resilience
paths run by default; tests opt into them where needed.

### Out of scope

* Coverage gates and CI configuration (Task #14).
* Frontend (React) component tests (Task #11/#15).
* Real Postgres in tests — Task #16 covers the DB stack overhaul; until then,
  the db mock is the contract.

---

## Adding a new test

1. Decide the tier:
   * Pure → `tests/unit/<area>/<file>.test.ts`
   * Single route or queue handler → `tests/integration/<area>/<file>.test.ts`
   * Multi-route user journey → `tests/e2e/<flow>.flow.test.ts`
2. If the test needs Express, prefer `await buildTestApp()` from `tests/utils/test-app.ts`.
3. If it needs auth, sign a token with `bearerForUser({ sub: "user-1" })`.
4. If it needs the DB, mock `@workspace/db` with the chain helpers above —
   don't reach for the real driver.
5. Run `pnpm --filter @workspace/api-server run test:<tier>` locally before
   committing.
