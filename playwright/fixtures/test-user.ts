import { test as base, type Page } from "@playwright/test";

// JWT key used by the React app: localStorage["smc_token"].
export interface TestUser {
  email: string;
  nome: string;
  senha: string;
}

export function makeTestUser(suffix: string | number = Date.now()): TestUser {
  return {
    email: `e2e+${suffix}@playwright.test`,
    nome: `Playwright User ${suffix}`,
    senha: "playwright-pw-1234",
  };
}

interface Fixtures {
  testUser: TestUser;
  /** Origin of the running app (for example, http://localhost:5173). */
  appBaseUrl: string;
  /** Origin of the API server. By default the app base + /api. */
  apiBaseUrl: string;
  registerAndLogin: (page: Page, user?: TestUser) => Promise<TestUser>;
}

function resolveAppBaseUrl(): string {
  if (process.env["PLAYWRIGHT_BASE_URL"]) return process.env["PLAYWRIGHT_BASE_URL"];
  return `http://127.0.0.1:${process.env["WEB_PORT"] ?? "5173"}`;
}

export const test = base.extend<Fixtures>({
  testUser: async ({}, use) => {
    await use(makeTestUser());
  },
  appBaseUrl: async ({}, use) => {
    await use(resolveAppBaseUrl());
  },
  apiBaseUrl: async ({ appBaseUrl }, use) => {
    await use(process.env["PLAYWRIGHT_API_URL"] ?? appBaseUrl);
  },
  registerAndLogin: async ({ apiBaseUrl }, use) => {
    await use(async (page, user = makeTestUser()) => {
      const reg = await page.request.post(`${apiBaseUrl}/api/auth/register`, {
        data: user,
        failOnStatusCode: false,
      });
      if (![200, 201, 409].includes(reg.status())) {
        throw new Error(`registerAndLogin: register failed with ${reg.status()} ${await reg.text()}`);
      }
      const login = await page.request.post(`${apiBaseUrl}/api/auth/login`, {
        data: { email: user.email, senha: user.senha },
      });
      if (login.status() !== 200) {
        throw new Error(`registerAndLogin: login failed with ${login.status()}`);
      }
      const body = (await login.json()) as { token?: string };
      if (!body.token) {
        throw new Error("registerAndLogin: login response missing token");
      }
      await page.addInitScript(
        ([token]: [string]) => {
          window.localStorage.setItem("smc_token", token);
        },
        [body.token],
      );
      return user;
    });
  },
});

export { expect } from "@playwright/test";
