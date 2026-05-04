import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import type { Express } from "express";
import { chainOf, insertChain } from "../utils/db-chain.js";

interface FakeUser { id: string; email: string; nome: string; senhaHash: string }

const store: { users: FakeUser[] } = { users: [] };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(store.users),
      insert: () =>
        insertChain<FakeUser>((rows) => {
          for (const r of rows) store.users.push(r);
          return rows;
        }),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  store.users = [];
});

afterAll(() => vi.restoreAllMocks());

describe("E2E: register → login → /me happy path", () => {
  it("a brand-new user can register, then log in, then read their profile", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "e2e@example.com", nome: "E2E User", senha: "supersecret" });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();
    expect(store.users).toHaveLength(1);

    // Re-hash with low cost so the subsequent login compare is fast.
    store.users[0].senhaHash = await bcrypt.hash("supersecret", 4);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "e2e@example.com", senha: "supersecret" });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const me = await request(app)
      .get("/api/auth/me")
      .set("authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("e2e@example.com");
  });

  it("rejects /me with 401 when no Authorization header is present", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
