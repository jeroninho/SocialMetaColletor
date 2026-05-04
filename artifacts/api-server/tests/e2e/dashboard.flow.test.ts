import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf } from "../utils/db-chain.js";
import { installFetchMock } from "../../src/test/fetchMock.js";
import { makeToken } from "../fixtures/tokens.js";

const tokens: { rows: ReturnType<typeof makeToken>[] } = { rows: [] };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(tokens.rows),
      insert: () => ({ values: async () => undefined }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  delete process.env["REDIS_URL"];
  const { buildTestApp } = await import("../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  tokens.rows = [];
});

afterAll(() => vi.restoreAllMocks());

describe("E2E: dashboard summary + recent metadata + trends", () => {
  it("an unauthenticated visitor still gets all 3 dashboard endpoints OK", async () => {
    const installed = installFetchMock({ routes: [] });

    const summary = await request(app).get("/api/dashboard/summary");
    const trends = await request(app).get("/api/dashboard/engagement-trends");
    const recent = await request(app).get("/api/dashboard/recent-metadata");

    installed.restore();

    expect(summary.status).toBe(200);
    expect(trends.status).toBe(200);
    expect(recent.status).toBe(200);

    expect(summary.body.platformBreakdown).toHaveLength(5);
    expect(trends.body.dataPoints.length).toBeGreaterThan(0);
    expect(recent.body.items.length).toBeGreaterThan(0);
  });
});
