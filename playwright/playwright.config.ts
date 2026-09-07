import { defineConfig, devices } from "@playwright/test";

type WebServerConfig = NonNullable<Parameters<typeof defineConfig>[0]["webServer"]>;

function resolveBaseUrl(): string {
  if (process.env["PLAYWRIGHT_BASE_URL"]) return process.env["PLAYWRIGHT_BASE_URL"];
  return `http://127.0.0.1:${process.env["WEB_PORT"] ?? "5173"}`;
}

const baseURL = resolveBaseUrl();

// Skip the webServer block when targeting an already-running remote URL.
const skipWebServer =
  process.env["PLAYWRIGHT_SKIP_WEBSERVER"] === "1" || Boolean(process.env["PLAYWRIGHT_BASE_URL"]);

const apiPort = process.env["API_PORT"] ?? "8080";
const webPort = process.env["WEB_PORT"] ?? "5173";

const webServer: WebServerConfig | undefined = skipWebServer
  ? undefined
  : [
      {
        command: `pnpm --filter @workspace/api-server run dev`,
        cwd: "..",
        url: `http://127.0.0.1:${apiPort}/api/healthz`,
        reuseExistingServer: !process.env["CI"],
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          PORT: apiPort,
          NODE_ENV: "development",
        },
      },
      {
        command: `pnpm --filter @workspace/social-meta-collector run dev`,
        cwd: "..",
        url: `http://127.0.0.1:${webPort}/`,
        reuseExistingServer: !process.env["CI"],
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          PORT: webPort,
          API_PORT: apiPort,
          BASE_PATH: "/",
        },
      },
    ];

export default defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // The connections specs install per-test `page.route` mocks for
  // /api/auth/status; running them in parallel sometimes races the mock
  // installation against the SPA's first fetch, so we serialize.
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? "github" : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(webServer ? { webServer } : {}),
});
