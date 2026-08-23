import { expect, test, type Page } from "@playwright/test";
import { credentials, login, requiredProjectId } from "./helpers/auth";

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const projectId = requiredProjectId("PROJECT");
const workspaceProjectId = requiredProjectId("WORKSPACE");
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const fixtureAvailable = Boolean(customer && contractor && projectId && workspaceProjectId && adminEmail && adminPassword);

const forbiddenEnglish = [
  "Trust Center",
  "Trust profile",
  "Audit Trail",
  "Audit trail",
  "Change orders",
  "Milestones & Budget Control",
  "Loading...",
  "Something went wrong",
];

async function expectHealthyUi(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  const bodyText = await page.locator("body").innerText();
  for (const phrase of forbiddenEnglish) expect(bodyText, `В интерфейсе осталась английская надпись: ${phrase}`).not.toContain(phrase);

  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.document, "Страница не должна выходить за ширину viewport").toBeLessThanOrEqual(2);
  expect(overflow.body, "body не должен выходить за ширину viewport").toBeLessThanOrEqual(2);
}

async function openHealthy(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} не должен отвечать 5xx`).toBeLessThan(500);
  await expectHealthyUi(page);
}

async function expectNoBrokenInternalLinks(page: Page) {
  const links = await page.locator('a[href^="/"]').evaluateAll((nodes) =>
    Array.from(new Set(nodes.map((node) => (node as HTMLAnchorElement).getAttribute("href")).filter(Boolean))) as string[]
  );
  for (const href of links.slice(0, 30)) {
    const response = await page.request.get(href, { maxRedirects: 0 });
    expect(response.status(), `Внутренняя ссылка ${href} не должна возвращать 5xx`).toBeLessThan(500);
  }
}

test.describe("pre-launch quality gate", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() => test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision fixtures"));

  test("public routes, 404 and internal links are production-safe", async ({ page }) => {
    await page.context().clearCookies();
    for (const path of ["/", "/contractors", "/legal/privacy", "/legal/terms", "/legal/personal-data-consent"]) await openHealthy(page, path);
    await openHealthy(page, "/e2e-route-that-must-not-exist");
    await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    await openHealthy(page, "/contractors");
    await expectNoBrokenInternalLinks(page);
  });

  test("customer critical journey has no 5xx, overflow or legacy English", async ({ page }) => {
    await login(page, customer!);
    for (const path of [
      "/customer/dashboard",
      "/customer/projects",
      `/customer/projects/${projectId}`,
      `/customer/projects/${projectId}/matches`,
      "/customer/bids",
      `/customer/work/${workspaceProjectId}`,
      `/customer/work/${workspaceProjectId}/contract`,
      `/customer/work/${workspaceProjectId}/documents`,
      `/customer/work/${workspaceProjectId}/issues`,
      `/customer/work/${workspaceProjectId}/disputes`,
    ]) await openHealthy(page, path);
  });

  test("contractor critical journey has no 5xx, overflow or legacy English", async ({ page }) => {
    await login(page, contractor!);
    for (const path of [
      "/contractor/dashboard",
      "/contractor/projects",
      `/contractor/projects/${projectId}`,
      "/contractor/bids",
      "/contractor/company",
      "/contractor/company/trust",
      `/contractor/work/${workspaceProjectId}`,
      `/contractor/work/${workspaceProjectId}/contract`,
      `/contractor/work/${workspaceProjectId}/documents`,
      `/contractor/work/${workspaceProjectId}/issues`,
      `/contractor/work/${workspaceProjectId}/disputes`,
    ]) await openHealthy(page, path);
  });

  test("admin critical journey has no 5xx, overflow or legacy English", async ({ page }) => {
    await login(page, { email: adminEmail!, password: adminPassword! });
    for (const path of [
      "/admin/dashboard",
      "/admin/projects",
      "/admin/contractors",
      "/admin/users",
      "/admin/disputes",
      "/admin/operations",
      "/admin/data-quality",
      "/admin/score",
      "/admin/analytics",
      "/admin/analytics/matching",
      "/admin/analytics/discovery",
      "/admin/release",
      "/admin/errors",
    ]) await openHealthy(page, path);
  });
});
