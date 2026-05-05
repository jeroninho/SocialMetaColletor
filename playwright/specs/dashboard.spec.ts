import { test, expect } from "../fixtures/test-user.js";

test.describe("Dashboard UI", () => {
  test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => window.localStorage.removeItem("smc_token"));

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test("authenticated user sees the dashboard with platform metric cards", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // The dashboard renders a card per platform from /api/dashboard/summary.
    const body = page.locator("body");
    await expect(body).toContainText(/YouTube/i, { timeout: 10_000 });
    await expect(body).toContainText(/Instagram/i);
    await expect(body).toContainText(/Facebook/i);
  });
});
