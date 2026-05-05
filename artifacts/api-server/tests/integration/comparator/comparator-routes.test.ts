import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf } from "../../utils/db-chain.js";
import { bearerForUser } from "../../utils/auth-headers.js";

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
const auth = bearerForUser({ sub: "user-1" });

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

afterAll(() => vi.restoreAllMocks());

describe("GET /api/comparator (auth)", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const res = await request(app).get("/api/comparator?platforms=youtube");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  it("returns 401 when the Bearer token is invalid", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/comparator (validation)", () => {
  it("returns 400 when the platforms parameter is missing", async () => {
    const res = await request(app)
      .get("/api/comparator")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/platforms parameter is required/);
  });

  it("returns 400 when the platforms parameter is whitespace only", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=%20%20")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/platforms parameter is required/);
  });

  it("returns 400 when an unknown platform is requested", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube,myspace")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid platforms: myspace/);
    expect(res.body.error).toMatch(/Valid: youtube, instagram, facebook, tiktok, twitter/);
  });

  it("returns 400 when startDate is malformed", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube&startDate=2025/01/01&endDate=2025-01-31")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid date format/);
  });

  it("returns 400 when endDate is malformed", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube&startDate=2025-01-01&endDate=not-a-date")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid date format/);
  });

  it("returns 400 when startDate is not before endDate", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube&startDate=2025-02-01&endDate=2025-01-31")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/startDate must be before endDate/);
  });

  it("returns 400 when startDate equals endDate", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube&startDate=2025-01-15&endDate=2025-01-15")
      .set("Authorization", auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/startDate must be before endDate/);
  });
});

describe("GET /api/comparator (happy paths)", () => {
  it("returns a comparison entry for a single platform with default dates", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=youtube")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.availablePlatforms).toEqual([
      "youtube",
      "instagram",
      "facebook",
      "tiktok",
      "twitter",
    ]);
    expect(res.body.comparison).toHaveLength(1);

    const entry = res.body.comparison[0];
    expect(entry.platform).toBe("youtube");
    expect(entry.period).toEqual({
      startDate: "2025-01-01",
      endDate: "2025-01-31",
      days: 30,
    });
    expect(entry.summary.followers).toBe(184200);
    expect(entry.summary.growthRate).toBe(3.2);
    expect(entry.dataPoints.length).toBe(12);

    const recomputedTotal = entry.dataPoints.reduce(
      (s: number, p: { views: number }) => s + p.views,
      0,
    );
    expect(entry.summary.totalViews).toBe(recomputedTotal);
  });

  it("normalizes whitespace and casing in the platforms list and aggregates multiple entries", async () => {
    const res = await request(app)
      .get(
        "/api/comparator?platforms=YouTube%20,%20instagram,facebook&startDate=2025-01-01&endDate=2025-01-08",
      )
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.comparison).toHaveLength(3);
    expect(res.body.comparison.map((e: { platform: string }) => e.platform)).toEqual([
      "youtube",
      "instagram",
      "facebook",
    ]);

    for (const entry of res.body.comparison) {
      expect(entry.period.startDate).toBe("2025-01-01");
      expect(entry.period.endDate).toBe("2025-01-08");
      expect(entry.period.days).toBe(7);
      expect(entry.dataPoints.length).toBe(7);
      expect(entry.summary.avgEngagementRate).toBeGreaterThan(0);
    }
  });

  it("caps the number of data points at 12 for long date ranges", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=tiktok&startDate=2025-01-01&endDate=2025-12-31")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    const entry = res.body.comparison[0];
    expect(entry.dataPoints.length).toBe(12);
    expect(entry.period.days).toBe(364);
    expect(entry.summary.followers).toBe(324000);
  });

  it("returns each requested valid platform individually", async () => {
    const res = await request(app)
      .get("/api/comparator?platforms=tiktok,twitter")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.comparison).toHaveLength(2);
    const platforms = res.body.comparison.map((e: { platform: string }) => e.platform);
    expect(platforms).toEqual(["tiktok", "twitter"]);
  });
});
