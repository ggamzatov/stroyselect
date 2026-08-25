import { expect, test } from "@playwright/test";

import { credentials, login, logout } from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const deliveryProjectId = process.env.E2E_DELIVERY_PROJECT_ID?.trim() || null;
const fixtureAvailable = Boolean(customer && contractor && deliveryProjectId);

test.describe("material delivery", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() =>
    test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision isolated material delivery fixture")
  );

  test("customer books Yandex delivery and contractor sees pickup state", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/work/${deliveryProjectId}/materials`);
    await expect(page.getByRole("heading", { name: "Яндекс Доставка", exact: true })).toBeVisible();

    await page.getByLabel("Широта объекта").fill("42.9850000");
    await page.getByLabel("Долгота объекта").fill("47.5100000");
    await page.getByRole("button", { name: "Рассчитать доставку", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Варианты доставки", exact: true })).toBeVisible();
    await expect(page.getByText(/1\s*450\s*₽/).first()).toBeVisible();

    await page.getByRole("button", { name: "Создать заявку", exact: true }).first().click();
    await expect(
      page.getByRole("heading", { name: "Заявка создана, но ещё не подтверждена", exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Подтвердить доставку", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ожидает забора", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Обновить статус", exact: true }).click();
    await expect(page.getByRole("heading", { name: "В доставке", exact: true })).toBeVisible();
    await expect(
      page.getByText("Материалы забраны у поставщика и едут на объект.", { exact: true })
    ).toBeVisible();

    await logout(page);
    await login(page, contractor!);
    await page.goto(`/contractor/work/${deliveryProjectId}/materials`);
    await expect(page.getByRole("heading", { name: "Яндекс Доставка", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "В доставке", exact: true })).toBeVisible();
  });
});
