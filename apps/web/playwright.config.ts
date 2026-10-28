import { defineConfig, devices } from "@playwright/test";

const timezoneId = "America/Argentina/Buenos_Aires";
process.env.TZ = timezoneId;

const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgresql://app:app@localhost:5432/app_e2e";
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

// En CI el runner tiene 2 cores y `next dev` compila cada ruta la primera vez que un test la
// pide. Un build de producción tarda un par de minutos y después sirve todo ya compilado.
const nextServerCommand = process.env.CI
  ? `pnpm exec next build && pnpm exec next start -p ${port}`
  : `pnpm exec next dev -p ${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./e2e/support/global-setup.ts",
  use: {
    baseURL,
    locale: "es-AR",
    timezoneId,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /(mobile|accesibilidad)\.spec\.ts/,
    },
  ],
  webServer: {
    command: nextServerCommand,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      CRON_SECRET: "e2e-cron-secret",
      AUTH_RATE_LIMIT: "off",
      RATE_LIMIT: "off",
      RESEND_API_KEY: "",
      EMAIL_FROM: "Mi Producto <no-reply@example.com>",
      STORAGE_ENDPOINT: "",
      STORAGE_BUCKET: "",
      STORAGE_ACCESS_KEY_ID: "",
      STORAGE_SECRET_ACCESS_KEY: "",
    },
  },
});
