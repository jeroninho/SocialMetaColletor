import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { insertChain, chainOf } from "../../utils/db-chain.js";
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
});

afterAll(() => vi.restoreAllMocks());

const FB_URL = "https://www.facebook.com/some/post/123";

describe("POST /api/fetch-metadata edge cases", () => {
  it("returns 200 with parsed OG metadata on a successful HTML response", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Hello World" />
        <meta property="og:site_name" content="Example Page" />
        <meta property="og:description" content="A nice description" />
        <meta property="og:image" content="https://cdn.example.com/img.jpg" />
      </head><body></body></html>
    `;
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url === FB_URL,
          respond: () => ({ contentType: "text/html", body: html }),
        },
      ],
    });

    const res = await request(app).post("/api/fetch-metadata").send({ url: FB_URL });
    installed.restore();

    expect(res.status).toBe(200);
    expect(res.body.platform).toBe("facebook");
    expect(res.body.title).toBe("Hello World");
    expect(res.body.author).toBe("Example Page");
    expect(res.body.description).toBe("A nice description");
    expect(res.body.thumbnailUrl).toBe("https://cdn.example.com/img.jpg");
    expect(res.body.historyId).toBe(1);
    expect(state.historyRows).toHaveLength(1);
  });

  it("returns 500 fetch_failed when the upstream responds with a non-200 status", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url === FB_URL,
          respond: () => ({ status: 502, contentType: "text/html", body: "<html>bad gateway</html>" }),
        },
      ],
    });

    const res = await request(app).post("/api/fetch-metadata").send({ url: FB_URL });
    installed.restore();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("fetch_failed");
    expect(state.historyRows).toHaveLength(0);
  });

  it("returns 500 fetch_failed when the upstream responds with a non-HTML JSON body", async () => {
    // httpGet parses application/json bodies as objects. extractMetaTags expects
    // a string and will throw, which the route translates into fetch_failed.
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url === FB_URL,
          respond: () => ({
            status: 200,
            contentType: "application/json",
            body: { not: "html" },
          }),
        },
      ],
    });

    const res = await request(app).post("/api/fetch-metadata").send({ url: FB_URL });
    installed.restore();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("fetch_failed");
    expect(state.historyRows).toHaveLength(0);
  });

  it("returns 500 fetch_failed when the upstream fetch fails outright (network error)", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url === FB_URL,
          respond: () => {
            throw new TypeError("fetch failed: ECONNREFUSED");
          },
        },
      ],
    });

    const res = await request(app).post("/api/fetch-metadata").send({ url: FB_URL });
    installed.restore();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("fetch_failed");
    expect(state.historyRows).toHaveLength(0);
  });

  it("returns 500 fetch_failed when the upstream responds with an unfollowed redirect status", async () => {
    // Documents how the route reacts when an upstream returns a 3xx that the
    // HTTP layer surfaces directly (e.g. an unsupported scheme in Location, or
    // a redirect loop terminated by the runtime). httpGet treats it as
    // non-ok and the route maps that to fetch_failed.
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url === FB_URL,
          respond: () => ({
            status: 301,
            contentType: "text/html",
            body: "<html>moved</html>",
          }),
        },
      ],
    });

    const res = await request(app).post("/api/fetch-metadata").send({ url: FB_URL });
    installed.restore();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("fetch_failed");
    expect(state.historyRows).toHaveLength(0);
  });

  it("rejects oversized HTML responses with response_too_large", async () => {
    // Build a >2MB HTML payload. The route should refuse to buffer the whole
    // body and return a deterministic 413 response_too_large error.
    const filler = "<div>padding</div>".repeat(300_000);
    const oversized = `<html><head><meta property="og:title" content="Big Page" /></head><body>${filler}</body></html>`;

    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url === FB_URL,
          respond: () => ({ contentType: "text/html", body: oversized }),
        },
      ],
    });

    const res = await request(app).post("/api/fetch-metadata").send({ url: FB_URL });
    installed.restore();

    expect(res.status).toBe(413);
    expect(res.body.error).toBe("response_too_large");
    expect(state.historyRows).toHaveLength(0);
  });
});
