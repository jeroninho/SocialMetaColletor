import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf, insertChain } from "../../utils/db-chain.js";
import { installFetchMock } from "../../../src/test/fetchMock.js";

interface FakeHistoryRow { id: number; platform: string; url: string }

const state: { historyRows: FakeHistoryRow[]; nextId: number } = {
  historyRows: [],
  nextId: 1,
};

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(state.historyRows),
      insert: () =>
        insertChain<FakeHistoryRow>((rows) => {
          const stored = rows.map((r) => ({ ...r, id: state.nextId++ }));
          state.historyRows.unshift(...stored);
          return stored;
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
  state.historyRows = [];
  state.nextId = 1;
  delete process.env["YOUTUBE_API_KEY"];
});

afterAll(() => vi.restoreAllMocks());

describe("POST /api/fetch-metadata", () => {
  it("returns 400 when the URL is missing", async () => {
    const res = await request(app).post("/api/fetch-metadata").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("returns 400 unsupported_platform for an unknown URL", async () => {
    const res = await request(app)
      .post("/api/fetch-metadata")
      .send({ url: "https://example.com/post/1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unsupported_platform");
  });

  it("fetches YouTube metadata via oembed when API key is absent", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("youtube.com/oembed"),
          respond: () => ({
            body: {
              title: "Test Video",
              author_name: "Test Channel",
              thumbnail_url: "https://example.com/thumb.jpg",
            },
          }),
        },
      ],
    });

    const res = await request(app)
      .post("/api/fetch-metadata")
      .send({ url: "https://www.youtube.com/watch?v=abc123" });
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("youtube");
    expect(res.body.title).toBe("Test Video");
    expect(res.body.author).toBe("Test Channel");
    expect(res.body.historyId).toBe(1);
    expect(state.historyRows).toHaveLength(1);
  });

  it("fetches TikTok metadata via oembed", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("tiktok.com/oembed"),
          respond: () => ({
            body: { title: "Funny clip", author_name: "@creator", thumbnail_url: "x.jpg" },
          }),
        },
      ],
    });

    const res = await request(app)
      .post("/api/fetch-metadata")
      .send({ url: "https://www.tiktok.com/@creator/video/123" });
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("tiktok");
    expect(res.body.author).toBe("@creator");
  });
});

describe("GET /api/fetch-metadata/history", () => {
  it("returns rows in JSON envelope with limit/offset", async () => {
    state.historyRows = [
      {
        id: 1,
        platform: "youtube",
        url: "https://www.youtube.com/watch?v=x",
      } as unknown as FakeHistoryRow,
    ];
    // Add fields the route formatter expects.
    Object.assign(state.historyRows[0], {
      title: "T",
      author: "A",
      fetchedAt: new Date(),
      publishedAt: null,
      tags: null,
    });

    const res = await request(app).get("/api/fetch-metadata/history?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
    expect(res.body.offset).toBe(0);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].platform).toBe("youtube");
  });
});
