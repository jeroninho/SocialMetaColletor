import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

interface FakeToken {
  platform: string;
  accountName: string;
  connected: boolean;
  connectedAt: Date;
  expiresAt: Date | null;
  scope: string | null;
}

const state = { rows: [] as FakeToken[] };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          where: async () => state.rows.filter((r) => r.connected),
        }),
      }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  state.rows = [];
});

afterAll(() => vi.restoreAllMocks());

describe("Reconnect contract — /api/auth/status drives the connections-page banner", () => {
  it("connected YouTube with the analytics scope returns needsReconnect=false (happy path)", async () => {
    state.rows = [{
      platform: "youtube",
      accountName: "Channel A",
      connected: true,
      connectedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
    }];

    const res = await request(app).get("/api/auth/status");
    expect(res.status).toBe(200);
    expect(res.body.youtube.connected).toBe(true);
    expect(res.body.youtube.needsReconnect).toBe(false);
    expect(res.body.youtube.missingScopes).toEqual([]);
  });

  it("connected YouTube with only the read scope reports needsReconnect=true and lists the missing analytics scope", async () => {
    state.rows = [{
      platform: "youtube",
      accountName: "Channel B",
      connected: true,
      connectedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      scope: "https://www.googleapis.com/auth/youtube.readonly",
    }];

    const res = await request(app).get("/api/auth/status");
    expect(res.status).toBe(200);
    expect(res.body.youtube.needsReconnect).toBe(true);
    expect(res.body.youtube.missingScopes).toContain("https://www.googleapis.com/auth/yt-analytics.readonly");
  });

  it("a token row with scope=null is treated as missing every required scope", async () => {
    state.rows = [{
      platform: "youtube",
      accountName: "Channel C",
      connected: true,
      connectedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      scope: null,
    }];

    const res = await request(app).get("/api/auth/status");
    expect(res.body.youtube.needsReconnect).toBe(true);
    expect(res.body.youtube.missingScopes.length).toBeGreaterThan(0);
  });

  it("unconnected platforms default to connected=false and are absent from the scope check", async () => {
    state.rows = [];
    const res = await request(app).get("/api/auth/status");
    expect(res.status).toBe(200);
    expect(res.body.youtube).toEqual({ connected: false });
    expect(res.body.facebook).toEqual({ connected: false });
    expect(res.body.instagram).toEqual({ connected: false });
  });
});
