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

  try {
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 8_000 });
  } catch (error) {
    const currentUrl = page.url();
    const message = await page
      .locator("form")
      .getByText(/.+/)
      .filter({ has: page.locator("[role='alert'], .text-red-700, .text-red-600") })
      .first()
      .textContent({ timeout: 500 })
      .catch(() => null);
    const bodyText = await page.locator("body").innerText({ timeout: 500 }).catch(() => "");
    const cookies = await page.context().cookies().catch(() => []);
    const sessionCookies = cookies
      .filter((cookie) => cookie.name.includes("stroyselect_session"))
      .map((cookie) => `${cookie.name}; secure=${cookie.secure}; domain=${cookie.domain}; path=${cookie.path}`)
      .join(" | ");

    throw new Error(
      `E2E login failed for ${account.email}. ` +
        `Form message: ${message?.trim() || "нет сообщения"}. ` +
        `Session cookies: ${sessionCookies || "нет session cookie"}. ` +
        `Current URL: ${currentUrl}. ` +
        `Page text: ${bodyText.replace(/\s+/g, " ").slice(0, 700) || "нет текста"}.\n` +
        `Original assertion: ${String(error)}`
    );
  }
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

export function requiredProjectId(name: "PROJECT" | "WORKSPACE" | "COMPLETED") {
  const envName = name === "PROJECT" ? "E2E_PROJECT_ID" : `E2E_${name}_PROJECT_ID`;
  return process.env[envName]?.trim() || null;
}

export const mutationsEnabled = process.env.E2E_RUN_MUTATIONS === "1";
