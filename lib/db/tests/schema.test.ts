import { describe, expect, it } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  tokensTable,
  metadataTable,
  fetchHistoryTable,
  usersTable,
  alertRulesTable,
  alertHistoryTable,
  syncSchedulesTable,
} from "../src/index.js";

const allTables = {
  tokensTable,
  metadataTable,
  fetchHistoryTable,
  usersTable,
  alertRulesTable,
  alertHistoryTable,
  syncSchedulesTable,
} as const;

describe("@workspace/db schema integrity", () => {
  it("exports all expected tables under stable names", () => {
    expect(getTableName(tokensTable)).toBe("tokens");
    expect(getTableName(metadataTable)).toBe("metadata");
    expect(getTableName(fetchHistoryTable)).toBe("fetch_history");
    expect(getTableName(usersTable)).toBe("users");
    expect(getTableName(alertRulesTable)).toBe("alert_rules");
    expect(getTableName(alertHistoryTable)).toBe("alert_history");
    expect(getTableName(syncSchedulesTable)).toBe("sync_schedules");
  });

  describe("tokensTable", () => {
    it("declares the columns OAuth flows depend on", () => {
      const cols = getTableColumns(tokensTable);
      for (const c of [
        "id",
        "platform",
        "accountName",
        "accessToken",
        "refreshToken",
        "connected",
        "scope",
        "expiresAt",
        "connectedAt",
        "createdAt",
        "updatedAt",
      ]) {
        expect(cols).toHaveProperty(c);
      }
    });

    it("marks accessToken and platform as NOT NULL", () => {
      const cols = getTableColumns(tokensTable);
      expect(cols["accessToken"]?.notNull).toBe(true);
      expect(cols["platform"]?.notNull).toBe(true);
    });

    it("connected defaults to true", () => {
      const cols = getTableColumns(tokensTable);
      expect(cols["connected"]?.hasDefault).toBe(true);
    });
  });

  describe("usersTable", () => {
    it("uses email as a unique column and stores senhaHash NOT NULL", () => {
      const cols = getTableColumns(usersTable);
      expect(cols["email"]?.isUnique).toBe(true);
      expect(cols["senhaHash"]?.notNull).toBe(true);
    });
  });

  describe("metadataTable", () => {
    it("includes the analytics columns the dashboard reads", () => {
      const cols = getTableColumns(metadataTable);
      for (const c of [
        "platform",
        "contentType",
        "contentId",
        "views",
        "likes",
        "comments",
        "shares",
        "impressions",
        "reach",
        "engagementRate",
        "collectedAt",
      ]) {
        expect(cols).toHaveProperty(c);
      }
    });
  });

  it("every table exposes a primary 'id' column", () => {
    for (const [name, table] of Object.entries(allTables)) {
      const cols = getTableColumns(table);
      expect(cols, `${name} should have id`).toHaveProperty("id");
    }
  });
});
