import { expect, test } from "@playwright/test";

import { credentials, login, logout, requiredProjectId } from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const workspaceProjectId = requiredProjectId("WORKSPACE");
const paymentId = process.env.E2E_PAYMENT_ID?.trim();

const fixtureAvailable = Boolean(
  customer && contractor && adminEmail && adminPassword && workspaceProjectId && paymentId
);

test.describe("production hardening", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision production-hardening fixtures");
  });

  test("customer cannot access admin monitoring", async ({ page }) => {
    await login(page, customer!);
    await page.goto("/admin/errors");
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  });

  test("client error is captured and visible to admin", async ({ page }) => {
    const marker = `E2E observability ${Date.now()}`;

    await login(page, customer!);
    await page.goto("/customer/dashboard");

    const response = await page.evaluate(async (message) => {
      const result = await fetch("/api/errors/client", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          message,
          route: "/e2e/observability",
          digest: "e2e-observability",
          metadata: { suite: "production-hardening" },
        }),
      });

      return { ok: result.ok, status: result.status };
    }, marker);

    expect(response.ok, `client error endpoint returned ${response.status}`).toBeTruthy();

    await logout(page);
    await login(page, { email: adminEmail!, password: adminPassword! });
    await page.goto("/admin/errors");
    await expect(page).toHaveURL(/\/admin\/errors/);

    const errorCard = page.getByText(marker, { exact: true }).locator("xpath=ancestor::article");
    await expect(errorCard).toBeVisible();
    await expect(errorCard).toContainText("/e2e/observability");
    await expect(errorCard).toContainText(customer!.email);
  });

  test("payment requires confirmation by both participants", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/work/${workspaceProjectId}/changes`);

    const customerCard = page.getByText("E2E платёж для подтверждения").locator("xpath=ancestor::article");
    await expect(customerCard).toBeVisible();
    await customerCard.getByRole("button", { name: "Подтвердить платёж" }).click();
    await expect(customerCard).toContainText("Заказчик: подтверждено");

    await logout(page);
    await login(page, contractor!);
    await page.goto(`/contractor/work/${workspaceProjectId}/changes`);

    const contractorCard = page.getByText("E2E платёж для подтверждения").locator("xpath=ancestor::article");
    await expect(contractorCard).toBeVisible();
    await expect(contractorCard).toContainText("Заказчик: подтверждено");
    await contractorCard.getByRole("button", { name: "Подтвердить платёж" }).click();
    await expect(contractorCard).toContainText("Подтверждён обеими сторонами");
    await expect(contractorCard).toContainText("Подрядчик: подтверждено");
  });
});
