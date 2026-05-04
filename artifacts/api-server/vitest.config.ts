import { defineConfig } from "vitest/config";

const sharedResolve = { conditions: ["workspace"] };

export default defineConfig({
  resolve: sharedResolve,
  test: {
    pool: "forks",
    projects: [
      {
        resolve: sharedResolve,
        test: {
          name: "unit",
          environment: "node",
          globals: false,
          setupFiles: ["./src/test/setup.ts"],
          include: [
            "src/**/*.test.ts",
            "tests/unit/**/*.test.ts",
          ],
        },
      },
      {
        resolve: sharedResolve,
        test: {
          name: "integration",
          environment: "node",
          globals: false,
          setupFiles: [
            "./src/test/setup.ts",
            "./tests/setup/integration-setup.ts",
          ],
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 15000,
        },
      },
      {
        resolve: sharedResolve,
        test: {
          name: "e2e",
          environment: "node",
          globals: false,
          setupFiles: [
            "./src/test/setup.ts",
            "./tests/setup/integration-setup.ts",
          ],
          include: ["tests/e2e/**/*.test.ts"],
          testTimeout: 30000,
        },
      },
    ],
  },
});
