import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

test.describe("Móvil", () => {
  test("el inicio abre con el menú hamburguesa y la tipografía es Google Sans, igual que en desktop", async ({
    authenticatedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al viewport de celular");
    await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible();
    const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(fontFamily).toContain("Google Sans");
  });

  test("ninguna pantalla principal del estudiante scrollea a lo ancho", async ({ page }) => {
    await loginViaUi(page, seededUsers.estudiante);
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await expect(page.getByText(/\d+ clases? · 5K2/)).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/clases");
    await expect(page.getByRole("heading", { name: "Buscar clases" })).toBeVisible();
    await expect(page.getByLabel("Comisión")).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/preferencias");
    await expect(page.getByText("Comisiones que seguís")).toBeVisible();
    await expect(page.getByText("Proyecto Final").first()).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/estado-institucional");
    await expect(page.getByText("Historial")).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/mi-perfil");
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);
  });

  test("las pantallas del bedel y el pop-up de novedad del docente no scrollean a lo ancho", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await expect(page.getByRole("heading", { name: "Estado institucional" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cambiar estado" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    await expect(page.getByRole("dialog", { name: "Publicar novedad" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await page.keyboard.press("Escape");

    await page.goto("/qr");
    await expect(page.getByText("Próximamente")).toBeVisible();
    await expectNoHorizontalPageScroll(page);
  });

  test("elegir una sección en el menú lateral navega y lo cierra", async ({
    authenticatedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al menú lateral móvil");
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    const sidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]');
    await sidebar.getByRole("link", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/\/clases/);
    await expect(sidebar).toBeHidden();
  });
});
