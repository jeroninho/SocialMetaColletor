import { test, expect } from "../fixtures/test-user.js";

/**
 * /connections page is driven by GET /api/auth/status. We mock that response
 * with `page.route()` to assert the three UI contracts that the route handler
 * is responsible for: connected, needs-reconnect (banner), and disconnected.
 *
 * The connect button navigates to /api/auth/{platform}/connect — we intercept
 * the navigation to verify the link without depending on real Google OAuth.
 */

const STATUS_RE = /\/api\/auth\/status$/;

function buildStatus(overrides: Record<string, unknown> = {}) {
  return {
    youtube: { connected: false },
    instagram: { connected: false },
    facebook: { connected: false },
    tiktok: { connected: false },
    twitter: { connected: false },
    ...overrides,
  };
}

test.describe("Connections page UI", () => {
  test("unauthenticated /connections bounces to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => window.localStorage.removeItem("smc_token"));
    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test("renders one card per supported platform when authenticated", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.route(STATUS_RE, (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(buildStatus()) }),
    );

    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    const body = page.locator("body");
    await expect(body).toContainText(/YouTube/i, { timeout: 10_000 });
    await expect(body).toContainText(/Instagram/i, { timeout: 10_000 });
    await expect(body).toContainText(/Facebook/i, { timeout: 10_000 });
    await expect(body).toContainText(/TikTok/i, { timeout: 10_000 });
    await expect(body).toContainText(/Twitter|X\b/i, { timeout: 10_000 });
  });

  test("happy path: a fully-connected YouTube account shows the Conectado badge", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.route(STATUS_RE, (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          buildStatus({
            youtube: {
              connected: true,
              accountName: "test-channel",
              connectedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600_000).toISOString(),
              needsReconnect: false,
              missingScopes: [],
            },
          }),
        ),
      }),
    );

    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    const badge = page.getByTestId("badge-youtube-status");
    await expect(badge).toContainText(/Conectado/i, { timeout: 10_000 });
    // The reconnect banner must NOT appear on the happy path.
    await expect(page.getByTestId("alert-youtube-reconnect")).toHaveCount(0);
  });

  test("needsReconnect=true renders the reconnect banner and Reconectar button", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.route(STATUS_RE, (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          buildStatus({
            youtube: {
              connected: true,
              accountName: "test-channel",
              connectedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600_000).toISOString(),
              needsReconnect: true,
              missingScopes: ["https://www.googleapis.com/auth/yt-analytics.readonly"],
            },
          }),
        ),
      }),
    );

    await page.goto("/connections", { waitUntil: "domcontentloaded" });

    const badge = page.getByTestId("badge-youtube-status");
    await expect(badge).toContainText(/Reconex[aã]o necess[áa]ria/i, { timeout: 10_000 });

    const banner = page.getByTestId("alert-youtube-reconnect");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/YouTube Analytics|Reconecte/i);

    await expect(page.getByTestId("button-youtube-reconnect")).toBeVisible();
  });

  test("clicking Conectar triggers navigation to /api/auth/youtube/connect", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.route(STATUS_RE, (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(buildStatus()) }),
    );

    // Intercept the connect endpoint so the test never actually hits Google.
    let connectCalled = false;
    await page.route(/\/api\/auth\/youtube\/connect$/, (route) => {
      connectCalled = true;
      return route.fulfill({
        status: 302,
        headers: { location: "/connections?oauth_status=success&platform=youtube" },
        body: "",
      });
    });

    await page.goto("/connections", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Conectar com YouTube/i }).click();

    await expect.poll(() => connectCalled, { timeout: 5000 }).toBe(true);
  });
});
