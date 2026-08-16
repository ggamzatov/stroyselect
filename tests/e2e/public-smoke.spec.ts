import { expect, test } from "@playwright/test";

test("liveness endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health/live");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: "ok" });
});

test("login and registration entry points render", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("body")).toContainText(/войти|вход/i);

  await page.goto("/register");
  await expect(page).toHaveURL(/\/register/);
  await expect(page.locator("body")).toContainText(/регистра/i);
});

test("security response headers are present", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
