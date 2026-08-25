import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { credentials, login, requiredProjectId, type E2ECredentials } from "./helpers/auth";

type AppRole = "public" | "customer" | "contractor" | "admin";

type RouteFixtures = {
  projectId: string;
  workspaceProjectId: string;
  completedProjectId: string;
  customerId: string;
  companyId: string;
  supplierId: string;
  disputeId: string;
  categorySlug: string;
  citySlug: string;
};

const customer = credentials("CUSTOMER");
const contractor = credentials("CONTRACTOR");
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const admin: E2ECredentials | null = adminEmail && adminPassword ? { email: adminEmail, password: adminPassword } : null;

const fixtures: RouteFixtures | null = makeRouteFixtures();
const appDir = path.join(process.cwd(), "app");
const e2eDir = path.join(process.cwd(), "tests", "e2e");
const sourcePagePatterns = discoverRoutes(appDir, /^page\.(?:tsx|ts|jsx|js)$/);
const sourceApiPatterns = discoverRoutes(appDir, /^route\.(?:tsx|ts|jsx|js)$/);
const sourceE2eSpecs = fs.readdirSync(e2eDir).filter((name) => name.endsWith(".spec.ts")).sort();
const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts?: Record<string, string> };
const productionE2eCommand = String(packageJson.scripts?.["test:e2e:production:seeded"] ?? "");

const EXPECTED_API_PATTERNS = [
  "/api/contracts/[projectId]/docx",
  "/api/errors/client",
  "/api/health/live",
  "/api/health/ready",
  "/api/internal/maintenance",
  "/api/marketplace/events",
  "/api/notifications/status",
  "/api/payments/yookassa/webhook",
  "/api/projects/[id]/chat/events",
].sort();

const fixtureAvailable = Boolean(customer && contractor && admin && fixtures);

function makeRouteFixtures(): RouteFixtures | null {
  const values = {
    projectId: requiredProjectId("PROJECT"),
    workspaceProjectId: requiredProjectId("WORKSPACE"),
    completedProjectId: requiredProjectId("COMPLETED"),
    customerId: process.env.E2E_CUSTOMER_ID?.trim() || null,
    companyId: process.env.E2E_COMPANY_ID?.trim() || null,
    supplierId: process.env.E2E_SUPPLIER_ID?.trim() || null,
    disputeId: process.env.E2E_DISPUTE_ID?.trim() || null,
    categorySlug: process.env.E2E_CATEGORY_SLUG?.trim() || null,
    citySlug: process.env.E2E_CITY_SLUG?.trim() || null,
  };
  if (Object.values(values).some((value) => !value)) return null;
  return values as RouteFixtures;
}

function discoverRoutes(root: string, filePattern: RegExp) {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (filePattern.test(entry.name)) files.push(full);
    }
  };
  walk(root);

  return files
    .map((file) => {
      const relative = path.relative(root, path.dirname(file)).split(path.sep);
      const segments = relative.filter((segment) => {
        if (!segment || segment === ".") return false;
        if (segment.startsWith("@")) return false;
        if (segment.startsWith("_") && !segment.startsWith("[")) return false;
        if (segment.startsWith("(") && segment.endsWith(")")) return false;
        return true;
      });
      return segments.length ? `/${segments.join("/")}` : "/";
    })
    .sort();
}

function roleForRoute(pattern: string): AppRole {
  if (pattern === "/dashboard" || pattern === "/change-password" || pattern === "/notification-settings") return "customer";
  if (pattern.startsWith("/admin")) return "admin";
  if (pattern.startsWith("/contractor")) return "contractor";
  if (pattern.startsWith("/customer")) return "customer";
  return "public";
}

function resolveRoute(pattern: string, data: RouteFixtures) {
  const route = pattern.replace(/\[([^\]]+)\]/g, (_, parameter: string) => {
    if (parameter === "projectId") return data.workspaceProjectId;
    if (parameter === "category") return data.categorySlug;
    if (parameter === "city") return data.citySlug;
    if (parameter !== "id") throw new Error(`Unsupported dynamic route parameter [${parameter}] in ${pattern}`);

    if (
      pattern.startsWith("/admin/contractors/") ||
      pattern.startsWith("/contractors/") ||
      pattern.startsWith("/customer/contractors/")
    ) return data.companyId;
    if (pattern.startsWith("/admin/disputes/")) return data.disputeId;
    if (pattern.startsWith("/admin/projects/")) return data.workspaceProjectId;
    if (pattern.startsWith("/admin/suppliers/")) return data.supplierId;
    if (pattern.startsWith("/admin/users/")) return data.customerId;
    if (pattern.startsWith("/contractor/projects/")) return data.projectId;
    if (pattern.startsWith("/contractor/work/")) return data.workspaceProjectId;
    if (pattern.startsWith("/customer/projects/")) return data.projectId;
    if (pattern.startsWith("/customer/work/")) return data.workspaceProjectId;
    if (pattern.startsWith("/api/projects/")) return data.workspaceProjectId;

    throw new Error(`No E2E [id] resolver for ${pattern}`);
  });

  if (/\[[^\]]+\]/.test(route)) throw new Error(`Unresolved dynamic route: ${pattern}`);
  return route;
}

async function auditRenderedPage(page: Page, pattern: string, route: string, role: AppRole) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];

  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  const onResponse = (response: { status(): number; url(): string }) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(400);

    expect(response, `${pattern}: navigation response is missing`).not.toBeNull();
    expect(response!.status(), `${pattern}: expected a real page, got HTTP ${response!.status()}`).toBeLessThan(400);
    if (role !== "public") expect(new URL(page.url()).pathname, `${pattern}: authenticated role was redirected to login`).not.toBe("/login");

    await expect(page.locator("body"), `${pattern}: body must be visible`).toBeVisible();
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    expect(bodyText.length, `${pattern}: page must contain visible text`).toBeGreaterThan(0);

    const domAudit = await page.evaluate(() => {
      const overflow = {
        html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      };

      const seenIds = new Set<string>();
      const duplicateIds = new Set<string>();
      document.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
        if (!element.id) return;
        if (seenIds.has(element.id)) duplicateIds.add(element.id);
        seenIds.add(element.id);
      });

      const brokenLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .map((link) => link.getAttribute("href") ?? "")
        .filter((href) => !href.trim() || /(?:undefined|null|NaN)/.test(href) || /^javascript:/i.test(href));

      const missingAlt = Array.from(document.querySelectorAll<HTMLImageElement>("img:not([alt])"))
        .map((image) => image.getAttribute("src") || "<img>");

      const isVisible = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && element.getClientRects().length > 0;
      };
      const hasName = (element: HTMLElement) => {
        const aria = element.getAttribute("aria-label")?.trim();
        const labelledBy = element.getAttribute("aria-labelledby")?.trim();
        const title = element.getAttribute("title")?.trim();
        const text = element.textContent?.replace(/\s+/g, " ").trim();
        const placeholder = element.getAttribute("placeholder")?.trim();
        const value = element instanceof HTMLInputElement && ["submit", "button"].includes(element.type) ? element.value.trim() : "";
        const labels = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement
          ? Array.from(element.labels ?? []).map((label) => label.textContent?.trim()).filter(Boolean)
          : [];
        const nestedAlt = element.querySelector("img[alt]")?.getAttribute("alt")?.trim();
        return Boolean(aria || labelledBy || title || text || placeholder || value || labels.length || nestedAlt);
      };
      const unnamedControls = Array.from(document.querySelectorAll<HTMLElement>("button, a[href], input:not([type='hidden']), select, textarea"))
        .filter(isVisible)
        .filter((element) => !hasName(element))
        .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.getAttribute("name") ? `[name=${element.getAttribute("name")}]` : ""}`)
        .slice(0, 20);

      return { overflow, duplicateIds: [...duplicateIds], brokenLinks, missingAlt, unnamedControls };
    });

    expect(domAudit.overflow.html, `${pattern}: document must not overflow horizontally`).toBeLessThanOrEqual(2);
    expect(domAudit.overflow.body, `${pattern}: body must not overflow horizontally`).toBeLessThanOrEqual(2);
    expect(domAudit.duplicateIds, `${pattern}: duplicate DOM ids`).toEqual([]);
    expect(domAudit.brokenLinks, `${pattern}: malformed internal links`).toEqual([]);
    expect(domAudit.missingAlt, `${pattern}: images without alt`).toEqual([]);
    expect(domAudit.unnamedControls, `${pattern}: visible controls without an accessible name`).toEqual([]);
    expect(serverErrors, `${pattern}: background 5xx responses`).toEqual([]);
    expect(pageErrors, `${pattern}: uncaught browser exceptions`).toEqual([]);
    expect(consoleErrors, `${pattern}: browser console errors`).toEqual([]);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  }
}

async function loginForRole(page: Page, role: AppRole) {
  if (role === "public") {
    await page.context().clearCookies();
    return;
  }
  const account = role === "customer" ? customer : role === "contractor" ? contractor : admin;
  if (!account) throw new Error(`Missing E2E credentials for ${role}`);
  await login(page, account);
}

test.describe("Full application audit", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(() => test.skip(!fixtureAvailable, "Run npm run e2e:seed to provision full application fixtures"));

  test("source route inventory has complete dynamic fixture coverage", async ({}, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "Inventory is identical across viewports");
    expect(sourcePagePatterns.length, "Expected the App Router page inventory to be discovered").toBeGreaterThan(50);
    const resolved = sourcePagePatterns.map((pattern) => resolveRoute(pattern, fixtures!));
    expect(new Set(resolved).size, "Every source page should resolve to a unique concrete E2E URL").toBe(resolved.length);
    expect(sourceApiPatterns, "Every route.ts must be explicitly accounted for by the API gate").toEqual(EXPECTED_API_PATTERNS);
    for (const spec of sourceE2eSpecs) {
      expect(productionE2eCommand, `Production E2E gate must include tests/e2e/${spec}`).toContain(`tests/e2e/${spec}`);
    }
  });

  for (const role of ["public", "customer", "contractor", "admin"] as const) {
    test(`${role}: every source page renders without browser, layout or accessibility errors`, async ({ page }) => {
      await loginForRole(page, role);
      const patterns = sourcePagePatterns.filter((pattern) => roleForRoute(pattern) === role);
      expect(patterns.length, `${role}: route group must not be empty`).toBeGreaterThan(0);

      for (const pattern of patterns) {
        const route = resolveRoute(pattern, fixtures!);
        await test.step(`${pattern} -> ${route}`, async () => {
          await auditRenderedPage(page, pattern, route, role);
        });
      }
    });
  }

  test("all API and metadata routes have an executable production probe", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chromium", "API probes are viewport-independent");

    const live = await request.get("/api/health/live");
    expect(live.status()).toBe(200);
    const ready = await request.get("/api/health/ready");
    expect(ready.status()).toBe(200);

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);

    const clientError = await request.post("/api/errors/client", {
      data: { message: "E2E full-app API probe", route: "/e2e/full-app-audit", metadata: { source: "playwright" } },
    });
    expect(clientError.status()).toBe(200);

    const marketplaceEvent = await request.post("/api/marketplace/events", {
      data: { eventName: "catalog_viewed", contractorId: fixtures!.companyId, metadata: { source: "playwright", path: "/contractors" } },
    });
    expect(marketplaceEvent.status()).toBe(200);

    const maintenance = await request.get("/api/internal/maintenance");
    expect(maintenance.status(), "Maintenance endpoint must reject calls without CRON_SECRET").toBe(401);

    const paymentWebhook = await request.post("/api/payments/yookassa/webhook", { data: {} });
    expect([400, 503], "YooKassa webhook must reject an invalid/unconfigured probe without side effects").toContain(paymentWebhook.status());

    await login(page, customer!);
    const authenticatedRequest = page.context().request;

    const notificationStatus = await authenticatedRequest.get("/api/notifications/status");
    expect(notificationStatus.status()).toBe(200);

    const contractDocx = await authenticatedRequest.get(`/api/contracts/${fixtures!.workspaceProjectId}/docx`);
    expect(contractDocx.status()).toBe(200);
    expect(contractDocx.headers()["content-type"] || "").toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    const chatPath = `/api/projects/${fixtures!.workspaceProjectId}/chat/events`;
    const chatResponsePromise = page.waitForResponse(
      (response) => new URL(response.url()).pathname === chatPath,
      { timeout: 15_000 }
    );
    await page.goto(`/customer/work/${fixtures!.workspaceProjectId}`, { waitUntil: "domcontentloaded" });
    const chatResponse = await chatResponsePromise;
    expect(chatResponse.status()).toBe(200);

    const notFound = await authenticatedRequest.get("/__e2e_route_that_must_not_exist__");
    expect(notFound.status()).toBe(404);
  });
});
