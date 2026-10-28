import type { Page } from "@playwright/test";

import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const fontFamilyOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);

const bodyFontFamily = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).fontFamily);

test.describe("Tipografía", () => {
  test("login y registro se ven con Google Sans", async ({ page }) => {
    await page.goto("/login");
    const loginBodyFont = await bodyFontFamily(page);
    expect(loginBodyFont).toContain("Google Sans");
    expect(await fontFamilyOf(page, '[data-slot="card-title"]')).toBe(loginBodyFont);

    await page.goto("/registro");
    const registerBodyFont = await bodyFontFamily(page);
    expect(registerBodyFont).toBe(loginBodyFont);
    expect(await fontFamilyOf(page, '[data-slot="card-title"]')).toBe(registerBodyFont);
  });

  test("estado institucional, configuración y mi perfil heredan la tipografía en sidebar, tarjetas, pop-up y menú", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    const referenceFont = await bodyFontFamily(page);
    expect(referenceFont).toContain("Google Sans");
    expect(await fontFamilyOf(page, 'h1:has-text("Estado institucional")')).toBe(referenceFont);
    expect(await fontFamilyOf(page, '[data-slot="sidebar-content"]')).toBe(referenceFont);

    await page.getByTestId("user-menu-trigger").click();
    await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeVisible();
    expect(await fontFamilyOf(page, '[data-slot="dropdown-menu-content"]')).toBe(referenceFont);
    await page.keyboard.press("Escape");

    await page.goto("/configuracion");
    expect(await bodyFontFamily(page)).toBe(referenceFont);
    expect(await fontFamilyOf(page, 'h1:has-text("Configuración")')).toBe(referenceFont);
    expect(await fontFamilyOf(page, '[data-slot="card"]')).toBe(referenceFont);

    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Nuevo usuario" }).click();
    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();
    expect(await fontFamilyOf(page, '[data-slot="dialog-content"]')).toBe(referenceFont);
    expect(await fontFamilyOf(page, '[data-slot="dialog-title"]')).toBe(referenceFont);
    await page.keyboard.press("Escape");

    await page.goto("/mi-perfil");
    expect(await bodyFontFamily(page)).toBe(referenceFont);
    expect(await fontFamilyOf(page, 'h1:has-text("Mi perfil")')).toBe(referenceFont);
  });

  test("la tipografía se mantiene en tema oscuro", async ({ authenticatedPage: page }) => {
    const lightFont = await bodyFontFamily(page);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await bodyFontFamily(page)).toBe(lightFont);
  });

  test("no hay pedidos a Google Fonts y al menos una fuente se sirve desde el dominio propio", async ({
    authenticatedPage: page,
  }) => {
    const requestUrls: string[] = [];
    page.on("request", (request) => requestUrls.push(request.url()));

    await page.goto("/");
    await page.goto("/configuracion");
    await page.waitForLoadState("networkidle");

    expect(requestUrls.some((url) => url.includes("fonts.googleapis.com"))).toBe(false);
    expect(requestUrls.some((url) => url.includes("fonts.gstatic.com"))).toBe(false);

    const ownOriginFontRequest = requestUrls.some(
      (url) => new URL(url).origin === new URL(page.url()).origin && /\.(woff2?|ttf)$/.test(url),
    );
    expect(ownOriginFontRequest).toBe(true);
  });

  test("una pantalla ya visitada se sigue viendo con texto legible sin conexión", async ({
    authenticatedPage: page,
    context,
  }) => {
    // El runtime caching de CSS y fuentes de @serwist/turbopack solo se activa en
    // NODE_ENV=production (ver defaultCache en su paquete): contra `next dev` el documento sí
    // se sirve cacheado, pero no sus assets. Con `CI=1` corre contra el build de producción.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await context.setOffline(true);
    await page.reload();
    const heading = page.getByRole("heading", { name: "Mis clases de hoy", level: 1 });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((el) => getComputedStyle(el).fontFamily)).not.toBe("");
    await context.setOffline(false);
  });
});
