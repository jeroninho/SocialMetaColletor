import { test, expect, makeTestUser } from "../fixtures/test-user.js";

test.describe("Auth UI flow", () => {
  test("/login renders the email/senha form and Entrar button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByPlaceholder(/seu@email\.com/i)).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Entrar$/i })).toBeVisible();
  });

  test("submitting wrong credentials shows an inline error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/seu@email\.com/i).fill("nobody@example.test");
    await page.locator("input[type='password']").fill("definitely-wrong");
    await page.getByRole("button", { name: /^Entrar$/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText(/inv[áa]lid|n[ãa]o encontrado|erro|wrong|incorret/i);
  });

  test("signup via the Cadastrar tab creates an account and lands on /dashboard", async ({ page }) => {
    const user = makeTestUser(`ui-signup-${Date.now()}`);

    await page.goto("/login");
    await page.getByRole("button", { name: /^Cadastrar$/i }).click();

    // Cadastrar mode adds a "Nome" field; email + senha are present in both modes.
    await page.getByPlaceholder(/Seu nome/i).fill(user.nome);
    await page.getByPlaceholder(/seu@email\.com/i).fill(user.email);
    await page.locator("input[type='password']").fill(user.senha);

    await page.getByRole("button", { name: /Cadastrar|Criar conta/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/dashboard/);
  });

  test("login → dashboard → logout returns to /login and clears the token", async ({ page, registerAndLogin }) => {
    await registerAndLogin(page);
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/);

    // Logout button in the sidebar has title="Sair" (LogOut icon).
    await page.getByRole("button", { name: "Sair" }).click();

    await page.waitForURL(/\/login/, { timeout: 10_000 });
    const stored = await page.evaluate(() => window.localStorage.getItem("smc_token"));
    expect(stored).toBeNull();
  });
});
