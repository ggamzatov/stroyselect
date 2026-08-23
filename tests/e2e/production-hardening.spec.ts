import { expect, test } from "@playwright/test";

import {
  credentials,
  login,
  logout,
  requiredProjectId,
} from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const admin = credentials("ADMIN");
const workspaceProjectId = requiredProjectId("WORKSPACE");
const fixtureAvailable = Boolean(customer && contractor && admin && workspaceProjectId);

test.describe("production hardening", () => {
  test.beforeEach(() => {
    test.skip(!fixtureAvailable, "Production hardening E2E fixture is not configured");
  });

  test("customer cannot access admin monitoring", async ({ page }) => {
    await login(page, customer!);
    const response = await page.goto("/admin/errors");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).not.toHaveURL(/\/admin\/errors/);
  });

  test("client error is captured and visible to admin", async ({ page, request }) => {
    const marker = `E2E client error ${Date.now()}`;

    await login(page, customer!);
    const response = await request.post("/api/errors/client", {
      data: {
        message: marker,
        path: "/e2e/observability",
        source: "e2e",
      },
    });
    expect(response.ok()).toBeTruthy();

    await logout(page);
    await login(page, admin!);
    await page.goto("/admin/errors");
    await expect(page).toHaveURL(/\/admin\/errors/);

    const errorCard = page.getByText(marker, { exact: true }).locator("xpath=ancestor::article");
    await expect(errorCard).toBeVisible();
    await expect(errorCard).toContainText("/e2e/observability");
    await expect(errorCard).toContainText(customer!.email);
  });

  test("manual payment archive keeps two-party confirmation while online payments are disabled", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/work/${workspaceProjectId}/changes`);
    await expect(page.getByRole("heading", { name: "Ручной учёт принятого этапа", exact: true })).toBeVisible();

    const customerCard = page.getByText("E2E платёж для подтверждения").locator("xpath=ancestor::article");
    await expect(customerCard).toBeVisible();
    await customerCard.getByRole("button", { name: "Подтвердить запись" }).click();
    await expect(customerCard).toContainText("Заказчик: подтверждено");

    await logout(page);
    await login(page, contractor!);
    await page.goto(`/contractor/work/${workspaceProjectId}/changes`);

    const contractorCard = page.getByText("E2E платёж для подтверждения").locator("xpath=ancestor::article");
    await expect(contractorCard).toBeVisible();
    await expect(contractorCard).toContainText("Заказчик: подтверждено");
    await contractorCard.getByRole("button", { name: "Подтвердить запись" }).click();
    await expect(contractorCard).toContainText("Подрядчик: подтверждено");
  });
});
