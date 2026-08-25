import { expect, test } from "@playwright/test";

import { credentials, login, logout, type E2ECredentials } from "./helpers/auth";

const contractor = credentials("CONTRACTOR");
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const admin: E2ECredentials | null = adminEmail && adminPassword ? { email: adminEmail, password: adminPassword } : null;
const adOrderId = process.env.E2E_AD_ORDER_ID?.trim();
const adTitle = process.env.E2E_AD_TITLE?.trim() || "E2E Ремонт без сюрпризов";
const erid = "E2E-ERID-2204";

const fixtureAvailable = Boolean(contractor && admin && adOrderId);

test.describe("advertising compliance lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() => test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision advertising fixture"));

  test("paid ad remains hidden until moderation and ERID, then becomes sponsored inventory", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByText(adTitle, { exact: true })).toHaveCount(0);

    await login(page, contractor!);
    await page.goto("/contractor/advertising");
    const contractorOrder = page.locator("article").filter({ hasText: adTitle }).first();
    await expect(contractorOrder).toBeVisible();
    await expect(contractorOrder.getByText("Оплачен", { exact: true })).toBeVisible();
    await contractorOrder.getByRole("button", { name: "Отправить на модерацию" }).click();
    await expect(page).toHaveURL(/\/contractor\/advertising\?moderation=1/);
    await expect(page.locator("article").filter({ hasText: adTitle }).first().getByText("Модерация", { exact: true })).toBeVisible();

    await logout(page);
    await login(page, admin!);
    await page.goto("/admin/ads");
    let adminOrder = page.locator("article").filter({ hasText: adTitle }).first();
    await expect(adminOrder).toBeVisible();
    await expect(adminOrder.getByText("Модерация", { exact: true })).toBeVisible();
    await adminOrder.getByRole("button", { name: "Одобрить" }).click();
    await expect(page).toHaveURL(/\/admin\/ads\?moderated=approve/);

    adminOrder = page.locator("article").filter({ hasText: adTitle }).first();
    await expect(adminOrder.getByText("Одобрен", { exact: true })).toBeVisible();
    await adminOrder.getByLabel("ERID").fill(erid);
    await adminOrder.getByLabel("Оператор рекламных данных").fill("E2E ОРД");
    await adminOrder.getByLabel("ID креатива у ОРД").fill("E2E-CREATIVE-2204");
    await adminOrder.getByLabel("Запустить сейчас на оплаченный срок").check();
    await adminOrder.getByRole("button", { name: "Зафиксировать ERID и расписание" }).click();
    await expect(page).toHaveURL(/\/admin\/ads\?published=active/);
    adminOrder = page.locator("article").filter({ hasText: adTitle }).first();
    await expect(adminOrder.getByText("Активен", { exact: true })).toBeVisible();
    await expect(adminOrder.getByText(`erid: ${erid}`, { exact: false })).toBeVisible();

    await logout(page);
    await page.goto("/");
    const sponsored = page.getByRole("complementary", { name: `Реклама: ${adTitle}` });
    await expect(sponsored).toBeVisible();
    await expect(sponsored.getByText("Реклама", { exact: true })).toBeVisible();
    await expect(sponsored.getByText(adTitle, { exact: true })).toBeVisible();
    await expect(sponsored.getByText(`erid: ${erid}`, { exact: true })).toBeVisible();
    await expect(sponsored.getByText("Рекламодатель: E2E Строй Подрядчик", { exact: true })).toBeVisible();

    const event = await request.post("/api/ads/events", {
      data: { orderId: adOrderId, eventType: "click", eventKey: "e2e-click-2204", pagePath: "/" },
    });
    expect(event.status()).toBe(204);
  });
});
