import { expect, test } from "@playwright/test";

import { credentials, login, logout, requiredProjectId } from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const workspaceProjectId = requiredProjectId("WORKSPACE");
const fixtureAvailable = Boolean(customer && contractor && workspaceProjectId);

const appointmentTitle = "E2E Выезд на объект";

test.describe("project communication scheduling", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision scheduling fixtures");
  });

  test("customer proposes a site visit", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/work/${workspaceProjectId}/appointments`);

    await expect(page.getByRole("heading", { name: "Встречи и выезды" })).toBeVisible();

    const start = futureMoscowLocal(24);
    const end = futureMoscowLocal(25);
    await page.getByLabel("Название").fill(appointmentTitle);
    await page.getByLabel("Начало").fill(start);
    await page.getByLabel("Окончание").fill(end);
    await page.getByLabel("Место или ссылка").fill("E2E тестовый объект");
    await page.getByRole("button", { name: "Предложить время" }).click();

    const pendingCard = page
      .locator("article")
      .filter({ hasText: appointmentTitle })
      .filter({ has: page.getByRole("button", { name: "Подтвердить" }) });
    await expect(pendingCard).toHaveCount(1);
    await expect(pendingCard).toContainText(/Ожидает подтверждения/i);
  });

  test("contractor confirms the proposed site visit", async ({ page }) => {
    await login(page, customer!);
    await logout(page);
    await login(page, contractor!);
    await page.goto(`/contractor/work/${workspaceProjectId}/appointments`);

    const card = page
      .locator("article")
      .filter({ hasText: appointmentTitle })
      .filter({ has: page.getByRole("button", { name: "Подтвердить" }) });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: "Подтвердить" }).click();
    await expect(card).toContainText(/Подтверждено/i);
  });
});

function futureMoscowLocal(hoursAhead: number) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000 + 3 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}
