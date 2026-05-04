/**
 * Build a minimal Express app for integration tests by mounting the real
 * router stack. Tests are expected to vi.mock("@workspace/db") (and any other
 * external boundary) before invoking this helper.
 */
import express, { type Express } from "express";
import pinoHttp from "pino-http";

export async function buildTestApp(): Promise<Express> {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  // pino-http attaches req.log; route handlers depend on it.
  app.use(
    pinoHttp({
      level: "silent",
    }),
  );
  const { default: router } = await import("../../src/routes/index.js");
  app.use("/api", router);
  return app;
}
