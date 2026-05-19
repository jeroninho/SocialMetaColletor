/**
 * Live-DB twin of `callback-persistence.test.ts`.
 *
 * The mocked-DB version verifies handler logic against an in-memory chain
 * shim. This file promotes the highest-risk OAuth callback path
 * (YouTube) to a real Postgres so we also catch SQL-level regressions:
 *   - the `onConflictDoUpdate` upsert pattern updates the existing row
 *     instead of inserting a duplicate
 *   - column defaults (`connected`, `connected_at`, `created_at`) are applied
 *   - re-running the callback does not produce duplicate rows for the same
 *     platform (enforced by the unique constraint on `tokens.platform`)
 *   - the encrypted token round-trips through a TEXT column unchanged
 *
 * Skips automatically when no live DATABASE_URL is configured.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { decryptToken } from "../../../../src/utils/crypto.js";
import { installFetchMock } from "../../../../src/test/fetchMock.js";
import { createLiveDb, isLiveDbAvailable, type LiveDbHandle } from "../../../utils/live-db.js";

// Holder shared with the hoisted vi.mock factory so it can read the live
// drizzle handle once `beforeAll` populates it.
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

describe.skipIf(!liveAvailable)("YouTube OAuth callback — live Postgres persistence", () => {
  let app: Express;
  let handle: LiveDbHandle;

  beforeAll(async () => {
    process.env["TOKEN_SECRET"] = "0".repeat(64);
    process.env["YOUTUBE_CLIENT_ID"] = "yt-test-client";
    process.env["YOUTUBE_CLIENT_SECRET"] = "yt-test-secret";

    handle = await createLiveDb({ tables: ["tokens"] });
    dbRef.current = handle.db;

    const { buildTestApp } = await import("../../../utils/test-app.js");
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await handle.pool.query("TRUNCATE TABLE tokens RESTART IDENTITY");
  });

  afterAll(async () => {
    dbRef.current = null;
    await handle?.cleanup();
    delete process.env["YOUTUBE_CLIENT_ID"];
    delete process.env["YOUTUBE_CLIENT_SECRET"];
    vi.restoreAllMocks();
  });

  async function obtainState(platform: string): Promise<string> {
    const res = await request(app).get(`/api/auth/${platform}/connect`).redirects(0);
    expect([302, 303]).toContain(res.status);
    const url = new URL(res.headers["location"] as string);
    const state = url.searchParams.get("state");
    expect(state).toBeTruthy();
    return state!;
  }

  function youtubeFetchRoutes(opts: { accessToken: string; refreshToken?: string; expiresIn?: number; channelTitle?: string }) {
    return [
      {
        match: (url: string) => url.includes("oauth2.googleapis.com/token"),
        respond: () => ({
          body: {
            access_token: opts.accessToken,
            refresh_token: opts.refreshToken,
            expires_in: opts.expiresIn ?? 3600,
            scope:
              "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
          },
        }),
      },
      {
        match: (url: string) => url.includes("youtube/v3/channels"),
        respond: () => ({
          body: { items: [{ snippet: { title: opts.channelTitle ?? "Live Channel" } }] },
        }),
      },
    ];
  }

  it("persists a row with column defaults applied and encrypted tokens", async () => {
    const installed = installFetchMock({
      routes: youtubeFetchRoutes({
        accessToken: "yt-live-access",
        refreshToken: "yt-live-refresh",
        channelTitle: "Persisted Channel",
      }),
    });

    const state = await obtainState("youtube");
    const res = await request(app)
      .get(`/api/auth/youtube/callback?code=fake&state=${state}`)
      .redirects(0);
    installed.restore();
    expect([302, 303]).toContain(res.status);

    const { tokensTable } = await import("@workspace/db");
    const rows = await handle.db.select().from(tokensTable).where(eq(tokensTable.platform, "youtube"));
    expect(rows).toHaveLength(1);

    const row = rows[0]!;
    expect(row.platform).toBe("youtube");
    expect(row.accountName).toBe("Persisted Channel");
    expect(row.connected).toBe(true);
    expect(row.scope).toContain("yt-analytics.readonly");

    // DEFAULTS — these come from the live DB, not the route.
    expect(row.connectedAt).toBeInstanceOf(Date);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row.id).toBeGreaterThan(0);

    // Encryption survives the TEXT column round-trip.
    expect(row.accessToken).not.toBe("yt-live-access");
    expect(decryptToken(row.accessToken)).toBe("yt-live-access");
    expect(row.refreshToken).not.toBeNull();
    expect(decryptToken(row.refreshToken!)).toBe("yt-live-refresh");

    const deltaMs = row.expiresAt!.getTime() - Date.now();
    expect(deltaMs).toBeGreaterThan(3500 * 1000);
    expect(deltaMs).toBeLessThan(3700 * 1000);
  });

  it("onConflictDoUpdate keeps exactly one row when the callback runs twice", async () => {
    const first = installFetchMock({
      routes: youtubeFetchRoutes({ accessToken: "first-access", channelTitle: "First Title" }),
    });
    const state1 = await obtainState("youtube");
    await request(app).get(`/api/auth/youtube/callback?code=x&state=${state1}`).redirects(0);
    first.restore();

    const second = installFetchMock({
      routes: youtubeFetchRoutes({ accessToken: "second-access", channelTitle: "Second Title" }),
    });
    const state2 = await obtainState("youtube");
    await request(app).get(`/api/auth/youtube/callback?code=y&state=${state2}`).redirects(0);
    second.restore();

    const { tokensTable } = await import("@workspace/db");
    const rows = await handle.db.select().from(tokensTable).where(eq(tokensTable.platform, "youtube"));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.accountName).toBe("Second Title");
    expect(decryptToken(rows[0]!.accessToken)).toBe("second-access");
  });

  it("does not write a row when the token-exchange returns non-2xx", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("oauth2.googleapis.com/token"),
          respond: () => ({ status: 400, body: { error: "invalid_grant" } }),
        },
      ],
    });
    const state = await obtainState("youtube");
    const res = await request(app)
      .get(`/api/auth/youtube/callback?code=bad&state=${state}`)
      .redirects(0);
    installed.restore();

    expect([302, 303]).toContain(res.status);
    expect((res.headers["location"] as string).toLowerCase()).toContain("error");

    const countRes = await handle.pool.query<{ count: string }>("SELECT COUNT(*)::text as count FROM tokens");
    expect(countRes.rows[0]!.count).toBe("0");
  });
});

describe.skipIf(!liveAvailable)("OAuth disconnect — live Postgres", () => {
  let app: Express;
  let handle: LiveDbHandle;

  beforeAll(async () => {
    process.env["TOKEN_SECRET"] = "0".repeat(64);
    handle = await createLiveDb({ tables: ["tokens"] });
    dbRef.current = handle.db;
    const { buildTestApp } = await import("../../../utils/test-app.js");
    app = await buildTestApp();
  });

  beforeEach(async () => {
    await handle.pool.query("TRUNCATE TABLE tokens RESTART IDENTITY");
  });

  afterAll(async () => {
    dbRef.current = null;
    await handle?.cleanup();
  });

  it("removes only the requested platform's rows and leaves siblings intact", async () => {
    const { tokensTable } = await import("@workspace/db");
    await handle.db.insert(tokensTable).values([
      { platform: "youtube", accountName: "YT", accessToken: "ct-yt" },
      { platform: "facebook", accountName: "FB", accessToken: "ct-fb" },
      { platform: "instagram", accountName: "IG", accessToken: "ct-ig" },
    ]);

    const res = await request(app).post("/api/auth/youtube/disconnect").send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });

    const remaining = await handle.db.select().from(tokensTable);
    expect(remaining.map((r) => r.platform).sort()).toEqual(["facebook", "instagram"]);
  });

  it("is a no-op when the platform has no rows", async () => {
    // `instagram` is a valid platform per DisconnectPlatformParams; with no
    // matching row the route still succeeds (delete affects zero rows).
    const res = await request(app).post("/api/auth/instagram/disconnect").send({});
    expect(res.status).toBe(200);
    const countRes = await handle.pool.query<{ count: string }>("SELECT COUNT(*)::text as count FROM tokens");
    expect(countRes.rows[0]!.count).toBe("0");
  });
});
