import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["workspace"],
  },
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    pool: "forks",
  },
});
