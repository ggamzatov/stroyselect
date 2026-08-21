import { expect, test } from "@playwright/test";

import {
  credentials,
  login,
  logout,
  mutationsEnabled,
  requiredProjectId,
} from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const projectId = requiredProjectId("PROJECT");
const workspaceProjectId = requiredProjectId("WORKSPACE") ?? projectId;
const completedProjectId = requiredProjectId("COMPLETED");

const fixtureAvailable = Boolean(customer && contractor && projectId);

test.describe("marketplace journey", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(
      !fixtureAvailable,
      "Set E2E_CUSTOMER_EMAIL, E2E_CUSTOMER_PASSWORD, E2E_CONTRACTOR_EMAIL, E2E_CONTRACTOR_PASSWORD and E2E_PROJECT_ID"
    );
  });

  test("customer sees matching and invitation pipeline", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/projects/${projectId}/matches`);

    await expect(page).toHaveURL(new RegExp(`/customer/projects/${projectId}/matches`));
    await expect(page.locator("body")).toContainText(/подрядчик|совпад|подбор/i);

    const invite = page.getByRole("button", { name: /пригласить к проекту/i }).first();
    const alreadyInvited = page.getByText(/приглашение отправлено|приглашён/i).first();
    await expect(invite.or(alreadyInvited)).toBeVisible();

    if (mutationsEnabled && (await invite.isVisible().catch(() => false))) {
      await invite.click();
      await expect(page.locator("body")).toContainText(/приглашение отправлено|приглашён/i);
    }
  });

  test("contractor opens project, invitation and bid form", async ({ page }) => {
    await login(page, contractor!);
    await page.goto(`/contractor/projects/${projectId}`);

    await expect(page).toHaveURL(new RegExp(`/contractor/projects/${projectId}`));
    await expect(page.getByText("Детализированная смета")).toBeVisible();
    await expect(page.getByRole("button", { name: /отправить предложение|обновить предложение/i })).toBeVisible();

    const acceptInvitation = page.getByRole("button", { name: /принять приглашение/i });
    if (mutationsEnabled && (await acceptInvitation.isVisible().catch(() => false))) {
      await acceptInvitation.click();
      await expect(page.locator("body")).toContainText(/принят|приглашен|приглашение/i);
    }

    if (mutationsEnabled) {
      const submit = page.getByRole("button", { name: /отправить предложение/i });
      if (await submit.isVisible().catch(() => false)) {
        await page.locator('input[name="price"]').fill("350000");
        await page.locator('input[name="durationDays"]').fill("30");
        await page.locator('textarea[name="scopeSummary"]').fill(
          "Подготовительные работы, основной монтаж, чистовая приемка и сдача результата заказчику."
        );
        await page.locator('textarea[name="materialsSummary"]').fill(
          "Основные расходные материалы включены, закупка согласуется с заказчиком до начала этапа."
        );
        await page.locator('textarea[name="paymentTerms"]').fill(
          "Оплата по этапам после приемки выполненных работ."
        );
        await page.locator('textarea[name="message"]').fill(
          "Готовы приступить после согласования графика и доступа на объект."
        );
        await submit.click();
        await expect(page.locator("body")).toContainText(/предложение.*(сохран|отправ)|успеш/i);
      }
    }
  });

  test("customer bid comparison surface is reachable", async ({ page }) => {
    await login(page, customer!);
    await page.goto(`/customer/projects/${projectId}/bids/compare`);

    await expect(page).toHaveURL(new RegExp(`/customer/projects/${projectId}/bids/compare`));
    await expect(page.locator("body")).toContainText(/предложен|сравн|подрядчик/i);
  });

  test("customer workspace exposes operational control center", async ({ page }) => {
    test.skip(!workspaceProjectId, "Set E2E_WORKSPACE_PROJECT_ID to a project with a selected contractor");
    await login(page, customer!);
    await page.goto(`/customer/work/${workspaceProjectId}`);

    for (const label of ["Обзор", "Бюджет и платежи", "Документы", "Замечания", "Споры"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }

    await page.getByRole("link", { name: "Бюджет и платежи" }).click();
    await expect(page).toHaveURL(new RegExp(`/customer/work/${workspaceProjectId}/changes`));
    await expect(page.locator("body")).toContainText(/платеж|бюджет|изменен/i);

    await page.getByRole("link", { name: "Документы" }).click();
    await expect(page).toHaveURL(new RegExp(`/customer/work/${workspaceProjectId}/documents`));
    await expect(page.locator("body")).toContainText(/документ|файл/i);

    await page.getByRole("link", { name: "Замечания" }).click();
    await expect(page).toHaveURL(new RegExp(`/customer/work/${workspaceProjectId}/issues`));
    await expect(page.locator("body")).toContainText(/замечан|работ/i);

    await page.getByRole("link", { name: "Споры" }).click();
    await expect(page).toHaveURL(new RegExp(`/customer/work/${workspaceProjectId}/disputes`));
    await expect(page.locator("body")).toContainText(/спор|аудит/i);
  });

  test("contractor workspace exposes the same project controls", async ({ page }) => {
    test.skip(!workspaceProjectId, "Set E2E_WORKSPACE_PROJECT_ID to a project with a selected contractor");
    await login(page, contractor!);
    await page.goto(`/contractor/work/${workspaceProjectId}`);

    for (const label of ["Обзор", "Бюджет и платежи", "Документы", "Замечания", "Споры"]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }

    await page.getByRole("link", { name: "Бюджет и платежи" }).click();
    await expect(page).toHaveURL(new RegExp(`/contractor/work/${workspaceProjectId}/changes`));
    await expect(page.locator("body")).toContainText(/платеж|бюджет|изменен/i);
  });

  test("notification preferences are configurable for participants", async ({ page }) => {
    await login(page, customer!);
    await page.goto("/notification-settings");
    await expect(page.locator("body")).toContainText(/уведомлен/i);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(7);

    await logout(page);
    await login(page, contractor!);
    await page.goto("/notification-settings");
    await expect(page.locator("body")).toContainText(/уведомлен/i);
  });

  test("completed project exposes contractor review", async ({ page }) => {
    test.skip(!completedProjectId, "Set E2E_COMPLETED_PROJECT_ID to test the final review stage");
    await login(page, customer!);
    await page.goto(`/customer/work/${completedProjectId}`);
    await expect(page.locator("body")).toContainText(/оценка подрядчика|отзыв/i);
  });
});
