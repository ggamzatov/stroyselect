import { expect, type Page } from "@playwright/test";

export type E2ECredentials = {
  email: string;
  password: string;
};

export function credentials(prefix: "CUSTOMER" | "CONTRACTOR"): E2ECredentials | null {
  const email = process.env[`E2E_${prefix}_EMAIL`]?.trim();
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export async function login(page: Page, account: E2ECredentials) {
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(account.email);
  await page.getByLabel("Пароль").fill(account.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

export function requiredProjectId(name: "PROJECT" | "WORKSPACE" | "COMPLETED") {
  const envName = name === "PROJECT" ? "E2E_PROJECT_ID" : `E2E_${name}_PROJECT_ID`;
  return process.env[envName]?.trim() || null;
}

export const mutationsEnabled = process.env.E2E_RUN_MUTATIONS === "1";
