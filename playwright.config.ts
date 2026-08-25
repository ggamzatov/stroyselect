import { defineConfig, devices } from "@playwright/test";

const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      testMatch: /(?:pre-launch-quality|full-app-audit)\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "node .next/standalone/server.js",
        url: `${baseURL}/api/health/live`,
        reuseExistingServer,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: "3000",
          HOSTNAME: "127.0.0.1",
          PLAYWRIGHT_BASE_URL: baseURL,
          E2E_ALLOW_INSECURE_SESSION: "1",
          YANDEX_DELIVERY_E2E_MOCK: "1",
          YOOKASSA_E2E_MOCK: "1",
        },
      },
});
