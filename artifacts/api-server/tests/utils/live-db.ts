/**
 * Live Postgres test helper.
 *
 * Spins up an isolated schema in the project's existing Postgres so a slim
 * subset of integration tests can exercise real SQL semantics (joins,
 * `ON CONFLICT`/`RETURNING`, defaults, unique constraints) without needing
 * a heavyweight container or a separate DB instance.
 *
 * Each call to `createLiveDb` allocates a unique schema (e.g.
 * `vtest_<pid>_<rand>`), applies the canonical schema DDL inside that
 * schema, and returns a Drizzle handle whose pool sets `search_path` to it.
 * The caller MUST invoke `cleanup()` (typically in `afterAll`) to drop the
 * schema and release connections.
 *
 * The DDL is derived at runtime from the Drizzle schema in `@workspace/db`
 * via `drizzle-kit/api`'s `generateMigration`, so the test schema cannot
 * drift from the application schema. When new columns/constraints are added
 * to a table, the test schema picks them up automatically.
 *
 * Tests gate themselves with `isLiveDbAvailable()` so the suite is a no-op
 * in environments without a real Postgres URL (the global `src/test/setup.ts`
 * sets a placeholder DATABASE_URL for unit tests).
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { randomBytes } from "crypto";
import * as schema from "@workspace/db/schema";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";

const PLACEHOLDER_DATABASE_URL = "postgres://test:test@localhost:5432/test";

/**
 * Optional informational allow-list of tables tests typically depend on.
 * The fixture always applies the FULL canonical schema (see
 * `getCanonicalSchemaSql`) so callers don't need to keep this list in sync
 * with new tables — it exists only as documentation and as a cheap
 * misspelling check on the `tables` option.
 */
const KNOWN_TABLES = [
  "tokens",
  "metadata",
  "users",
  "alert_rules",
  "alert_history",
  "sync_schedules",
  "fetch_history",
] as const;

export type SchemaTable = (typeof KNOWN_TABLES)[number];

export interface LiveDbHandle {
  db: NodePgDatabase<typeof schema>;
  pool: pg.Pool;
  schemaName: string;
  cleanup: () => Promise<void>;
}

/**
 * Resolve the DB URL to use for live tests. Returns `undefined` when only the
 * `src/test/setup.ts` placeholder is present so callers can skip cleanly.
 */
export function getLiveDbUrl(): string | undefined {
  const fromTest = process.env["TEST_DATABASE_URL"];
  if (fromTest && fromTest !== PLACEHOLDER_DATABASE_URL) return fromTest;
  const fromMain = process.env["DATABASE_URL"];
  if (fromMain && fromMain !== PLACEHOLDER_DATABASE_URL) return fromMain;
  return undefined;
}

let connectivityChecked = false;
let connectivityOk = false;

/**
 * Returns `true` only if a real Postgres URL is configured AND a basic
 * connection succeeds. Result is cached so test files can call it cheaply.
 */
export async function isLiveDbAvailable(): Promise<boolean> {
  if (connectivityChecked) return connectivityOk;
  connectivityChecked = true;
  const url = getLiveDbUrl();
  if (!url) {
    connectivityOk = false;
    return false;
  }
  const probe = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 2000, max: 1 });
  try {
    await probe.query("SELECT 1");
    connectivityOk = true;
  } catch {
    connectivityOk = false;
  } finally {
    await probe.end().catch(() => undefined);
  }
  return connectivityOk;
}

function makeSchemaName(): string {
  return `vtest_${process.pid}_${Date.now()}_${randomBytes(3).toString("hex")}`;
}

/**
 * Cache the SQL produced from the canonical schema. drizzle-kit's
 * `generateMigration` is not cheap (~hundreds of ms), and the result only
 * depends on the static `@workspace/db` schema for the lifetime of the
 * worker process.
 */
let cachedFullSchemaSql: string[] | null = null;

async function getCanonicalSchemaSql(): Promise<string[]> {
  if (cachedFullSchemaSql) return cachedFullSchemaSql;
  // `generateMigration` accepts the JSON snapshots that drizzle-kit emits
  // internally. Diffing an empty schema against the current schema yields
  // the full CREATE TABLE / CREATE INDEX / etc. set as a string array.
  const empty = generateDrizzleJson({});
  const full = generateDrizzleJson(schema);
  const sqls = await generateMigration(empty, full);
  cachedFullSchemaSql = sqls;
  return sqls;
}

export interface CreateLiveDbOptions {
  /**
   * Optional list of tables the test relies on. The full canonical schema is
   * applied either way (see `getCanonicalSchemaSql`); this list only acts as
   * documentation of intent and as a cheap misspelling check.
   */
  tables?: SchemaTable[];
}

/**
 * Create a fresh, isolated schema and return a Drizzle handle scoped to it.
 *
 * Throws if no live DB URL is configured — callers should gate on
 * `isLiveDbAvailable()` first.
 */
export async function createLiveDb(opts: CreateLiveDbOptions = {}): Promise<LiveDbHandle> {
  const url = getLiveDbUrl();
  if (!url) {
    throw new Error(
      "createLiveDb called without a live DATABASE_URL. Use isLiveDbAvailable() to gate.",
    );
  }
  const tables = opts.tables ?? ["tokens"];
  const known = new Set<string>(KNOWN_TABLES);
  for (const t of tables) {
    if (!known.has(t)) throw new Error(`Unknown live-db table: ${t}`);
  }
  const schemaName = makeSchemaName();

  // Use a short-lived admin pool to provision the schema; the pg `options`
  // startup parameter is then set on the actual test pool below so every
  // statement issued on it (including the generated DDL) targets the new
  // schema instead of `public`.
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await admin.query(`CREATE SCHEMA "${schemaName}"`);
  } finally {
    await admin.end().catch(() => undefined);
  }

  const pool = new pg.Pool({
    connectionString: url,
    max: 4,
    options: `-c search_path=${schemaName}`,
  });

  // Apply the FULL canonical schema rather than filtering by table name.
  // This avoids brittle string matching on generated SQL and means new
  // tables / FKs / types / indexes added to `@workspace/db` are picked up
  // automatically. Unused tables in the throw-away schema are dropped on
  // cleanup, so the cost is negligible.
  const statements = await getCanonicalSchemaSql();
  for (const stmt of statements) {
    await pool.query(stmt);
  }

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    schemaName,
    async cleanup() {
      await pool.end().catch(() => undefined);
      const dropPool = new pg.Pool({ connectionString: url, max: 1 });
      try {
        await dropPool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
      } catch {
        // schema may already be gone if a prior cleanup partially ran
      } finally {
        await dropPool.end().catch(() => undefined);
      }
    },
  };
}
