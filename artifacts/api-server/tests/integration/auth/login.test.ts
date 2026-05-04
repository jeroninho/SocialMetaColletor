import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import request from "supertest";
import type { Express } from "express";
import { chainOf, insertChain } from "../../utils/db-chain.js";

interface FakeUser {
  id: string;
  email: string;
  nome: string;
  senhaHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const userStore: { current: FakeUser | null } = { current: null };

vi.mock("@workspace/db", async () => {
  const actual = await vi.importActual<typeof import("@workspace/db")>("@workspace/db");
  return {
    ...actual,
    db: {
      select: () => chainOf(userStore.current ? [userStore.current] : []),
      insert: () => insertChain<FakeUser>(() => []),
    },
  };
});

let app: Express;

beforeAll(async () => {
  const { buildTestApp } = await import("../../utils/test-app.js");
  app = await buildTestApp();
});

beforeEach(() => {
  userStore.current = null;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 200 + JWT for valid credentials", async () => {
    userStore.current = {
      id: "user-1",
      email: "valid@example.com",
      nome: "Valid User",
      senhaHash: await bcrypt.hash("correct-password", 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "valid@example.com", senha: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({
      id: "user-1",
      email: "valid@example.com",
      nome: "Valid User",
    });
  });

  it("normalizes the e-mail to lower case before lookup", async () => {
    userStore.current = {
      id: "user-2",
      email: "lower@example.com",
      nome: "Lower",
      senhaHash: await bcrypt.hash("pw12345678", 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "Lower@Example.com", senha: "pw12345678" });

    expect(res.status).toBe(200);
  });

  it("returns 401 when the user is not found", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing@example.com", senha: "anything" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_credentials");
  });

  it("returns 401 when the password is wrong", async () => {
    userStore.current = {
      id: "user-3",
      email: "wrong@example.com",
      nome: "Wrong",
      senhaHash: await bcrypt.hash("real-password", 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrong@example.com", senha: "guess" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_credentials");
  });

  it("returns 400 with validation_error for malformed input", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", senha: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(Array.isArray(res.body.issues)).toBe(true);
  });
});
