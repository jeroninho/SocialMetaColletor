import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf } from "../../utils/db-chain.js";

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf([]),
      insert: () => ({ values: async () => undefined }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

afterAll(() => vi.restoreAllMocks());

describe("GET /api/dashboard/engagement-trends", () => {
  it("returns a non-empty 90-day trend dataset", async () => {
    const res = await request(app).get("/api/dashboard/engagement-trends");
    expect(res.status).toBe(200);
    expect(res.body.period).toBe("last-90-days");
    expect(Array.isArray(res.body.dataPoints)).toBe(true);
    expect(res.body.dataPoints.length).toBeGreaterThan(0);
    for (const point of res.body.dataPoints) {
      expect(point).toHaveProperty("date");
      for (const platform of ["youtube", "instagram", "facebook", "tiktok", "twitter"]) {
        expect(point).toHaveProperty(platform);
      }
    }
  });
});

describe("GET /api/dashboard/recent-metadata", () => {
  it("returns mock entries when the metadata table is empty", async () => {
    const res = await request(app).get("/api/dashboard/recent-metadata?limit=5");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.length).toBeLessThanOrEqual(5);
    expect(res.body).toHaveProperty("total");
  });

  it("defaults limit when not provided", async () => {
    const res = await request(app).get("/api/dashboard/recent-metadata");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
