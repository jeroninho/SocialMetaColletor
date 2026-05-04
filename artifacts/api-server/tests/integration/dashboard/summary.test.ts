import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf } from "../../utils/db-chain.js";
import { installFetchMock } from "../../../src/test/fetchMock.js";
import { makeToken } from "../../fixtures/tokens.js";

const tokenStore: { rows: ReturnType<typeof makeToken>[] } = { rows: [] };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(tokenStore.rows),
      insert: () => ({ values: async () => undefined }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  tokenStore.rows = [];
});

afterAll(() => vi.restoreAllMocks());

describe("GET /api/dashboard/summary", () => {
  it("returns mock fallback metrics for all 5 platforms when no tokens are connected", async () => {
    const installed = installFetchMock({ routes: [] });

    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.totalPlatforms).toBe(5);
    expect(res.body.connectedPlatforms).toBe(0);
    expect(Array.isArray(res.body.platformBreakdown)).toBe(true);
    expect(res.body.platformBreakdown).toHaveLength(5);
    for (const p of res.body.platformBreakdown) {
      expect(p.connected).toBe(false);
      expect(p.analyticsAvailable).toBe(false);
    }
  });

  it("aggregates totals across the platformBreakdown rows", async () => {
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

  it("includes analyticsAvailable=false when token is connected but provider call fails (resilient)", async () => {
    tokenStore.rows = [
      makeToken({ platform: "youtube", scope: "openid", connected: true }),
    ];

    const installed = installFetchMock({
      routes: [
        {
          match: () => true,
          respond: () => ({ status: 500, body: { error: "boom" } }),
        },
      ],
    });

    const res = await request(app).get("/api/dashboard/summary");
    installed.restore();

    expect(res.status).toBe(200);
    const yt = res.body.platformBreakdown.find(
      (p: { platform: string }) => p.platform === "youtube",
    );
    expect(yt.connected).toBe(true);
    expect(yt.analyticsAvailable).toBe(false);
  });
});
