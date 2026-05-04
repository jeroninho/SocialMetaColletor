import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { getTableColumns, getTableName } from "drizzle-orm";
import {
  tokensTable,
  usersTable,
  metadataTable,
  fetchHistoryTable,
  alertRulesTable,
  alertHistoryTable,
  syncSchedulesTable,
} from "../src/index.js";

// Live-DB migration check. Skipped when DATABASE_URL is unset so the suite
// still runs on a fresh clone without a Postgres provisioned.
const HAS_DB = Boolean(process.env["DATABASE_URL"]);

const expectedTables = [
  tokensTable,
  usersTable,
  metadataTable,
  fetchHistoryTable,
  alertRulesTable,
  alertHistoryTable,
  syncSchedulesTable,
];

interface PgColumn {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
}

let pool: Pool | undefined;

beforeAll(() => {
  if (!HAS_DB) return;
  pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
});

afterAll(async () => {
  await pool?.end();
});

describe.skipIf(!HAS_DB)("@workspace/db — migrations applied to the live database", () => {
  it("every table declared in the schema barrel exists in information_schema", async () => {
    const expectedNames = expectedTables.map((t) => getTableName(t));
    const { rows } = await pool!.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const present = new Set(rows.map((r) => r.table_name));

    const missing = expectedNames.filter((n) => !present.has(n));
    expect(
      missing,
      `Missing tables in DB — did you forget to run \`drizzle-kit push\`? Missing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every NOT NULL column declared by the schema is also NOT NULL in the live DB", async () => {
    for (const table of expectedTables) {
      const tname = getTableName(table);
      const declaredCols = getTableColumns(table);

      const { rows } = await pool!.query<PgColumn>(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [tname],
      );
      const liveByName = new Map(rows.map((c) => [c.column_name, c]));

      for (const [propName, col] of Object.entries(declaredCols)) {
        const colName = col.name;
        const live = liveByName.get(colName);
        expect(
          live,
          `Column ${tname}.${colName} (declared as ${propName}) is missing from the live schema`,
        ).toBeDefined();
        if (col.notNull) {
          expect(
            live!.is_nullable,
            `Column ${tname}.${colName} should be NOT NULL but the DB reports nullable=${live!.is_nullable}`,
          ).toBe("NO");
        }
      }
    }
  });

  it("the tokens table exposes the OAuth columns the callback writes to", async () => {
    const required = [
      "id",
      "platform",
      "account_name",
      "access_token",
      "refresh_token",
      "scope",
      "expires_at",
      "connected",
      "connected_at",
      "created_at",
      "updated_at",
    ];
    const { rows } = await pool!.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tokens'`,
    );
    const present = new Set(rows.map((r) => r.column_name));
    for (const c of required) {
      expect(present.has(c), `tokens.${c} missing from live DB`).toBe(true);
    }
  });
});

describe("@workspace/db — schema barrel push surface (no DB required)", () => {
  it("every exported *Table is a real Drizzle Table whose name is unique", () => {
    const seen = new Set<string>();
    for (const table of expectedTables) {
      const name = getTableName(table);
      expect(name).toBe(name.toLowerCase());
      expect(/^[a-z][a-z0-9_]*$/.test(name)).toBe(true);
      expect(seen.has(name), `${name} is duplicated in the schema barrel`).toBe(false);
      seen.add(name);
    }
    expect(seen.size).toBe(expectedTables.length);
  });
});
