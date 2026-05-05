import { test, expect, makeTestUser } from "../fixtures/test-user.js";

// The login page renders two text-equivalent buttons in places (the tab
// switcher AND the form submit button can both read "Entrar"), so each
// spec scopes its selectors with stable data-testid attributes added in
// `artifacts/social-meta-collector/src/pages/login.tsx`:
//   - `[data-testid="tab-login"]` / `[data-testid="tab-register"]` — tab pills
//   - `[data-testid="button-submit"]` — form submit button
const tabRegister = "[data-testid='tab-register']";
const tabLogin = "[data-testid='tab-login']";
const submitButton = "[data-testid='button-submit']";

test.describe("Auth UI flow", () => {
  test("/login renders the email/senha form and Entrar button", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByPlaceholder(/seu@email\.com/i)).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator(submitButton)).toBeVisible();
    await expect(page.locator(submitButton)).toContainText(/Entrar/i);
  });

  test("submitting wrong credentials shows an inline error and stays on /login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder(/seu@email\.com/i).fill("nobody@example.test");
    await page.locator("input[type='password']").fill("definitely-wrong");
    await page.locator(submitButton).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText(/inv[áa]lid|n[ãa]o encontrado|erro|wrong|incorret/i);
  });

  test("signup via the Cadastrar tab creates an account and lands on /dashboard", async ({ page }) => {
    const user = makeTestUser(`ui-signup-${Date.now()}`);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator(tabRegister).click();

    // Cadastrar mode adds a "Nome" field; email + senha are present in both modes.
    await page.getByPlaceholder(/Seu nome/i).fill(user.nome);
    await page.getByPlaceholder(/seu@email\.com/i).fill(user.email);
    await page.locator("input[type='password']").fill(user.senha);

    await page.locator(submitButton).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/dashboard/);
  });

  test("the Entrar/Cadastrar tab switcher toggles the Nome field on /login", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Default mode is Entrar — no Nome field is rendered.
    await expect(page.getByPlaceholder(/Seu nome/i)).toHaveCount(0);

    await page.locator(tabRegister).click();
    await expect(page.getByPlaceholder(/Seu nome/i)).toBeVisible();

    await page.locator(tabLogin).click();
    await expect(page.getByPlaceholder(/Seu nome/i)).toHaveCount(0);
  });

  test("login → dashboard → logout returns to /login and clears the token", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/dashboard/);

    // Logout button in the sidebar has title="Sair" (LogOut icon).
    await page.getByRole("button", { name: "Sair" }).click();

    await page.waitForURL(/\/login/, { timeout: 10_000 });
    const stored = await page.evaluate(() => window.localStorage.getItem("smc_token"));
    expect(stored).toBeNull();
  });
});
