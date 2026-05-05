# API server tests

Three Vitest projects, configured in `vitest.config.ts`:

| Project       | Glob                              | Purpose                                                                  |
| ------------- | --------------------------------- | ------------------------------------------------------------------------ |
| `unit`        | `src/**/*.test.ts`, `tests/unit/` | Pure-function tests; no network, no DB.                                  |
| `integration` | `tests/integration/**/*.test.ts`  | Route handlers wired through a real Express app (`buildTestApp`).        |
| `e2e`         | `tests/e2e/**/*.test.ts`          | Higher-level multi-step flows.                                           |

## Mocked-DB vs. live-DB integration tests

Integration tests come in two flavors that live side-by-side under
`tests/integration/`:

- **`*.test.ts`** — fast, default. Mocks `@workspace/db` with the in-memory
  chain shim in `tests/utils/db-chain.ts`. Catches handler-logic bugs
  without needing a Postgres.
- **`*.live.test.ts`** — exercises the same paths against a real Postgres
  for SQL-level coverage (defaults, `RETURNING`, `ON CONFLICT`, joins,
  unique constraints, idempotency of delete-then-insert, TEXT round-trip
  of encrypted tokens, …). Driven by `tests/utils/live-db.ts`.

### How the live fixture works

`createLiveDb({ tables })` does the following on every call:

1. Picks a DB URL: `TEST_DATABASE_URL` if set, else `DATABASE_URL`. The
   placeholder URL set by `src/test/setup.ts`
   (`postgres://test:test@localhost:5432/test`) is ignored — that's how
   the suite skips cleanly when no real DB is available.
2. Creates a brand-new schema in that database, named
   `vtest_<pid>_<ms>_<rand>`.
3. Generates the full schema DDL **at runtime** from the canonical
   Drizzle schema in `@workspace/db` via `drizzle-kit/api`
   (`generateDrizzleJson` + `generateMigration`) and applies it inside
   the new schema. The whole schema is applied (not just the requested
   tables) so new columns/FKs/indexes added to `@workspace/db` are picked
   up automatically without needing to update this fixture.
4. Returns a `pg` pool whose `search_path` startup parameter is set to
   that schema, plus a Drizzle handle bound to it.
5. `cleanup()` (called from `afterAll`) ends the pool and runs
   `DROP SCHEMA … CASCADE`.

Tests then swap the route's singleton `db` for the live handle using a
`vi.hoisted` Proxy mock around `@workspace/db`.

### Isolation tradeoff (read me)

The live fixture provides **schema-level** isolation against a single,
shared Postgres server — *not* a brand-new Postgres instance per test.
That's by design:

- Schemas are cheap to create/drop (~milliseconds), so each suite gets a
  fresh namespace and tests cannot see each other's rows.
- We avoid a heavyweight container or per-suite cluster startup, which
  would dominate the suite's runtime.
- The DB user must have `CREATE` and `DROP` privileges on the database;
  the default Replit Postgres user does.

If a future need calls for full server-level isolation (e.g. testing
`pg_stat_statements`, replication, or extension installation), swap
`createLiveDb` to return a per-suite Postgres via `testcontainers`. The
public API (`createLiveDb`, `cleanup`, the Drizzle handle shape) is
intentionally narrow so this swap stays local.

### Adding a new live test

1. Make sure the table you need is listed in `TABLE_TO_OBJECT` inside
   `tests/utils/live-db.ts`. Add it if not.
2. Create `tests/integration/<area>/<thing>.live.test.ts`.
3. Use the `vi.hoisted` + Proxy mock pattern from
   `callback-persistence.live.test.ts` so the routes' singleton `db` is
   replaced by your live handle.
4. Always wrap setup/teardown in `describe.skipIf(!liveAvailable)` so the
   suite is a no-op when no real DB URL is set.

### Running locally

```bash
# All integration tests (mocked + live where DB is available):
pnpm --filter @workspace/api-server run test:integration

# Just the live tests:
pnpm --filter @workspace/api-server exec vitest run --project=integration \
  tests/integration/**/*.live.test.ts

# Force-skip live tests (use the placeholder URL):
DATABASE_URL=postgres://test:test@localhost:5432/test \
  pnpm --filter @workspace/api-server run test:integration
```
