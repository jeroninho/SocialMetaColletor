/**
 * Live-DB twin of `summary.test.ts`.
 *
 * The mocked-DB version uses an in-memory chain shim to feed token rows
 * into the dashboard summary handler. This file promotes the
 * token-aggregation path to a real Postgres so we exercise the actual
 * `SELECT * FROM tokens` query, default values, and timestamps the route
 * relies on. Provider HTTP calls remain mocked via `installFetchMock`.
 *
 * Skips automatically when no live DATABASE_URL is configured.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { installFetchMock } from "../../../src/test/fetchMock.js";
import { encryptToken } from "../../../src/utils/crypto.js";
import { createLiveDb, isLiveDbAvailable, type LiveDbHandle } from "../../utils/live-db.js";

const { dbRef } = vi.hoisted(() => ({
  dbRef: { current: null as LiveDbHandle["db"] | null },
}));

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return new Proxy(actual, {
    get(target, key, receiver) {
      if (key === "db" && dbRef.current) return dbRef.current;
      return Reflect.get(target, key, receiver);
    },
  });
});

const liveAvailable = await isLiveDbAvailable();

describe.skipIf(!liveAvailable)("GET /api/dashboard/summary — live Postgres token aggregation", () => {
  let app: Express;
  let handle: LiveDbHandle;

  beforeAll(async () => {
    process.env["TOKEN_SECRET"] = "0".repeat(64);
    handle = await createLiveDb({ tables: ["tokens"] });
    dbRef.current = handle.db;
    const { buildTestApp } = await import("../../utils/test-app.js");
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await handle.pool.query("TRUNCATE TABLE tokens RESTART IDENTITY");
  });

  afterAll(async () => {
    dbRef.current = null;
    await handle?.cleanup();
    vi.restoreAllMocks();
  });

  it("returns mock fallback metrics for all 5 platforms when the tokens table is empty", async () => {
    const installed = installFetchMock({ routes: [] });
    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.totalPlatforms).toBe(5);
    expect(res.body.connectedPlatforms).toBe(0);
    expect(res.body.platformBreakdown).toHaveLength(5);
    for (const p of res.body.platformBreakdown) {
      expect(p.connected).toBe(false);
      expect(p.analyticsAvailable).toBe(false);
    }
  });

  it("flips a platform to connected:true once a real token row exists", async () => {
    const { tokensTable } = await import("@workspace/db");
    await handle.db.insert(tokensTable).values({
      platform: "youtube",
      accountName: "Live Channel",
      accessToken: encryptToken("yt-live"),
      scope: "openid",
      connected: true,
    });

    const installed = installFetchMock({
      routes: [
        { match: () => true, respond: () => ({ status: 500, body: { error: "boom" } }) },
      ],
    });
    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.connectedPlatforms).toBe(1);

    const yt = res.body.platformBreakdown.find(
      (p: { platform: string }) => p.platform === "youtube",
    );
    expect(yt.connected).toBe(true);
    // Provider call failed → analytics not available, but platform still connected.
    expect(yt.analyticsAvailable).toBe(false);
  });

  it("does not double-count when multiple rows exist for the same platform", async () => {
    // Inserting two rows for the same platform exercises the absence of a
    // unique constraint; the route's Map(platform → token) keeps only one.
    const { tokensTable } = await import("@workspace/db");
    await handle.db.insert(tokensTable).values([
      {
        platform: "youtube",
        accountName: "Older",
        accessToken: encryptToken("older-token"),
        connected: true,
      },
      {
        platform: "youtube",
        accountName: "Newer",
        accessToken: encryptToken("newer-token"),
        connected: true,
      },
    ]);

    const installed = installFetchMock({
      routes: [{ match: () => true, respond: () => ({ status: 500, body: {} }) }],
    });
    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    // Despite two rows, only one platform is reported as connected.
    expect(res.body.connectedPlatforms).toBe(1);
  });

  it("respects the `connected` boolean: rows with connected=false do not count", async () => {
    const { tokensTable } = await import("@workspace/db");
    await handle.db.insert(tokensTable).values({
      platform: "facebook",
      accountName: "Disconnected FB",
      accessToken: encryptToken("fb-token"),
      connected: false,
    });

    const installed = installFetchMock({ routes: [] });
    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.connectedPlatforms).toBe(0);
    const fb = res.body.platformBreakdown.find(
      (p: { platform: string }) => p.platform === "facebook",
    );
    expect(fb.connected).toBe(false);
  });

  it("preserves total = sum(platformBreakdown.followers) across the live select", async () => {
    const installed = installFetchMock({ routes: [] });
    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    const sumFollowers = res.body.platformBreakdown.reduce(
      (s: number, p: { followers: number }) => s + p.followers,
      0,
    );
    expect(res.body.totalFollowers).toBe(sumFollowers);
  });
});
