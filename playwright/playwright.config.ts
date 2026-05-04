import { defineConfig, devices } from "@playwright/test";

// Targets $REPLIT_DEV_DOMAIN when set, else localhost:80 (path-based proxy).
// Workflow startup is platform-managed; see TESTING.md.
function resolveBaseUrl(): string {
  if (process.env["PLAYWRIGHT_BASE_URL"]) return process.env["PLAYWRIGHT_BASE_URL"];
  if (process.env["REPLIT_DEV_DOMAIN"]) return `https://${process.env["REPLIT_DEV_DOMAIN"]}`;
  return "http://localhost:80";
}

export default defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? "github" : [["list"]],
  use: {
    baseURL: resolveBaseUrl(),
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
});
