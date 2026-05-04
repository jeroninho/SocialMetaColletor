import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["workspace"] },
  test: {
    name: "db",
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    pool: "forks",
  },
});
