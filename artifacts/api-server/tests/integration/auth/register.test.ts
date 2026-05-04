import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { chainOf, insertChain } from "../../utils/db-chain.js";

interface FakeUser { id: string; email: string; nome: string; senhaHash: string }

const state: { existing: FakeUser | null; inserted: FakeUser[] } = {
  existing: null,
  inserted: [],
};

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(state.existing ? [{ id: state.existing.id }] : []),
      insert: () =>
        insertChain<FakeUser>((rows) => {
          state.inserted.push(...rows);
          return rows;
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
  state.existing = null;
  state.inserted = [];
});

afterAll(() => vi.restoreAllMocks());

describe("POST /api/auth/register", () => {
  const validBody = {
    email: "new.user@example.com",
    nome: "New User",
    senha: "supersecret",
  };

  it("creates a user and returns a token + user envelope", async () => {
    const res = await request(app).post("/api/auth/register").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("new.user@example.com");
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].senhaHash).not.toBe("supersecret");
    expect(state.inserted[0].senhaHash.startsWith("$2")).toBe(true);
  });

  it("returns 409 when the e-mail already exists (case-insensitive)", async () => {
    state.existing = {
      id: "existing-1",
      email: "new.user@example.com",
      nome: "Existing",
      senhaHash: "$2b$04$abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc",
    };

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, email: "NEW.USER@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("conflict");
    expect(state.inserted).toHaveLength(0);
  });

  it("returns 400 when the password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, senha: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("returns 400 when the e-mail is malformed", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });
});
