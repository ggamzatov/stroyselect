import { expect, test, type Page } from "@playwright/test"

const viewports = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1728].map((width) => ({ width, height: 900 }))
const fixtureFreeRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/registration-success",
  "/legal/privacy",
  "/legal/terms",
  "/legal/personal-data-consent",
  "/missing-stroyselect-route",
]

async function expectStableViewport(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "networkidle" })
  expect(response?.status(), `${path} must render without a server error`).toBeLessThan(500)
  await expect(page.locator("body")).toBeVisible()

  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow.page, `${path} must not overflow horizontally`).toBeLessThanOrEqual(2)
  expect(overflow.body, `${path} body must not overflow horizontally`).toBeLessThanOrEqual(2)
  await expect(page.locator("a button, button a")).toHaveCount(0)
}

test("public UI remains responsive while the viewport changes", async ({ page }) => {
  test.setTimeout(120_000)
  const runtimeErrors: string[] = []

  page.on("console", (message) => {
    const isIntentionalNotFound = page.url().endsWith("/missing-stroyselect-route") && message.text().includes("404")
    if (message.type() === "error" && !isIntentionalNotFound) runtimeErrors.push(message.text())
  })
  page.on("pageerror", (error) => runtimeErrors.push(error.message))

  for (const path of fixtureFreeRoutes) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await expectStableViewport(page, path)
    }

    await page.setViewportSize({ width: 1280, height: 900 })
    await expectStableViewport(page, path)
  }

  expect(runtimeErrors).toEqual([])
})
