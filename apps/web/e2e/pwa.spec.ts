import { apiRetries, expect, test } from "./support/fixtures";

test.describe("PWA", () => {
  test("manifest, service worker y página offline", async ({ page, request }) => {
    const manifest = await request.get("/manifest.webmanifest", { maxRetries: apiRetries });
    expect(manifest.ok()).toBeTruthy();
    expect(await manifest.json()).toMatchObject({
      name: "SiGA",
      display: "standalone",
      start_url: "/",
    });

    const worker = await request.get("/serwist/sw.js", { maxRetries: apiRetries });
    expect(worker.ok()).toBeTruthy();
    expect(await worker.text()).toContain("~offline");

    await page.goto("/~offline");
    await expect(page.getByText("Sin conexión")).toBeVisible();
  });

  test("el manifest y los íconos se sirven sin sesión", async ({
    authenticatedPage: page,
    browser,
  }) => {
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/icons/apple-touch-icon.png",
    );
    const anonymousContext = await browser.newContext();
    expect((await anonymousContext.request.get("/icons/icon-192.png")).status()).toBe(200);
    expect((await anonymousContext.request.get("/manifest.webmanifest")).status()).toBe(200);
    await anonymousContext.close();
  });

  test("bloquea el zoom por pinch y por doble toque en móvil", async ({
    authenticatedPage: page,
  }) => {
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewportMeta).toContain("maximum-scale=1");
    expect(viewportMeta).toContain("user-scalable=no");

    const touchAction = await page.evaluate(
      () => getComputedStyle(document.documentElement).touchAction,
    );
    expect(touchAction).toBe("manipulation");
  });

  test("registra el service worker al cargar la app", async ({ authenticatedPage: page }) => {
    const registered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.scriptURL ?? null;
    });
    expect(registered).toContain("/serwist/sw.js");
  });
});
