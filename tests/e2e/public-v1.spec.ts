import { expect, test } from "@playwright/test";

import { credentials, login, logout, requiredProjectId } from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const projectId = requiredProjectId("PROJECT");
const workspaceProjectId = requiredProjectId("WORKSPACE");
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

const fixtureAvailable = Boolean(customer && contractor && projectId && workspaceProjectId && adminEmail && adminPassword);

test.describe("Public V1 product surfaces", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision Public V1 fixtures");
  });

  test("public contractor catalog is available without authentication", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/contractors");
    await expect(page).toHaveURL(/\/contractors(?:\?|$)/);
    await expect(page.getByRole("heading", { name: /Проверенные подрядчики/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/подрядчик/i);
  });

  test("matching v2 exposes explainable recommendations", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/projects/${projectId}/matches`);
    await expect(page.getByText("StroySelect Matching 2.0", { exact: true })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Почему подрядчик подходит|Факторы matching score/i);
  });

  test("bid comparison shows immutable revision number", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/projects/${projectId}/bids/compare`);
    await expect(page.locator("body")).toContainText(/Версия 1|Версия 2|Версия 3/i);
  });

  test("contract center is present for both project participants", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/work/${workspaceProjectId}`);
    await expect(page.getByRole("link", { name: "Договор" })).toBeVisible();
    await page.getByRole("link", { name: "Договор" }).click();
    await expect(page).toHaveURL(new RegExp(`/customer/work/${workspaceProjectId}/contract`));
    await expect(page.locator("body")).toContainText(/Договор и (?:электронное )?согласование|Сформировать договор|Создать договор/i);

    await logout(page);
    await login(page, contractor!);
    await page.goto(`/contractor/work/${workspaceProjectId}`);
    await expect(page.getByRole("link", { name: "Договор" })).toBeVisible();
  });

  test("contractor trust center is reachable by contractor", async ({ page }) => {
    await login(page, contractor!);
    await page.goto("/contractor/company/trust");
    await expect(page.getByRole("heading", { name: "Проверка и документы" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Trust Center|Страхование и лицензии/i);
  });

  test("admin operations dashboard reports marketplace KPIs", async ({ page }) => {
    await login(page, { email: adminEmail!, password: adminPassword! });
    await page.goto("/admin/operations");
    await expect(page.getByRole("heading", { name: "Операционный центр marketplace" })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Match → предложение|Предложение → найм|Повторные заказчики/i);
  });
});
