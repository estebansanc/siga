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
    await expect(page.getByRole("button", { name: "Generar QR" })).toBeVisible();
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

  test("incidencias del bedel: listado, formulario y detalle con historial no scrollean a lo ancho", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    const codigo = `Aula Mov ${Date.now().toString(36)}`;
    const aula = await page.request.post("/api/v1/aulas", {
      data: { codigo, edificio: "Edificio C", piso: "PB", capacidad: 30 },
    });
    const { id: aulaId } = (await aula.json()) as { id: string };
    const creada = await page.request.post("/api/v1/incidencias", {
      data: {
        aulaId,
        elemento: "MOBILIARIO",
        descripcion: "Faltan sillas y las que hay están rotas, con una descripción larga.",
        gravedad: "LEVE",
      },
    });
    const { id } = (await creada.json()) as { id: string };
    await page.request.post(`/api/v1/incidencias/${id}/estado`, {
      data: { estado: "EN_CURSO", observaciones: "Se pidió reposición al área de mantenimiento" },
    });

    const sinScrollHorizontalEnDialogo = async () => {
      const desborde = await page
        .getByRole("dialog")
        .last()
        .evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth);
      expect(desborde).toBeLessThanOrEqual(0);
      await expectNoHorizontalPageScroll(page);
    };

    await page.goto("/incidencias");
    await expect(page.getByRole("heading", { name: "Incidencias" }).first()).toBeVisible();
    const item = page.locator('[data-slot="item"]').filter({ hasText: `${codigo} · Mobiliario` });
    await expect(item).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.getByRole("button", { name: "Nueva incidencia" }).click();
    const reporte = page.getByRole("dialog", { name: "Nueva incidencia" });
    await expect(reporte.getByLabel("Elemento afectado")).toBeVisible();
    await reporte.getByRole("button", { name: "Reportar" }).click();
    await expect(reporte.getByText("Ingresá una descripción")).toBeVisible();
    await sinScrollHorizontalEnDialogo();
    await reporte.getByRole("button", { name: "Cancelar" }).click();

    await item.getByRole("button", { name: "Detalle" }).click();
    const detalle = page.getByRole("dialog", { name: `${codigo} · Mobiliario` });
    await expect(detalle.getByText("Se pidió reposición al área de mantenimiento")).toBeVisible();
    await sinScrollHorizontalEnDialogo();

    await page.request.post(`/api/v1/aulas/${aulaId}/baja`);
  });
});
