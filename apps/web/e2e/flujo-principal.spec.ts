import {
  expect,
  expectBadgeDentroDelEncabezado,
  expectNoHorizontalPageScroll,
  loginViaUi,
  logoutViaUi,
  newUser,
  registerViaUi,
  seededUsers,
  sinAvisosVigentes,
  test,
  verifyEmailViaLink,
} from "./support/fixtures";

// Fecha `yyyy-mm-dd` en hora argentina.
const fechaArgentina = (instante: Date) =>
  new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// El próximo lunes o jueves (desde mañana): Proyecto Final 5K2 se dicta esos días (seed), y
// una clase futura no depende de la hora a la que corre la suite.
const proximaClaseDeProyectoFinal = () => {
  const dia = new Date();
  do {
    dia.setDate(dia.getDate() + 1);
  } while (![1, 4].includes(new Date(`${fechaArgentina(dia)}T12:00:00Z`).getUTCDay()));
  return fechaArgentina(dia);
};

const formatoCorto = (fecha: string) => fecha.split("-").reverse().join("/");

test.describe("Flujo principal de SiGA", () => {
  test("la barra lateral muestra la marca y la institución", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar.getByText("SiGA")).toBeVisible();
    await expect(sidebar.getByText("UTN Facultad Regional Tucumán")).toBeVisible();
  });

  test("el bedel registra el estado institucional y se ve en el indicador y en el historial", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await expect(page.getByRole("heading", { name: "Estado institucional" })).toBeVisible();
    await expect(page.getByText("Ese ya es el estado actual.")).toBeVisible();

    await page.getByLabel("Nuevo estado").selectOption("ABIERTA_CON_NOVEDADES");
    const motivo = "Paro de transporte: las clases se dictan con normalidad".padEnd(280, " y");
    await page.getByLabel(/Motivo/).fill(motivo);
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByText("Estado registrado")).toBeVisible();
    await page.getByRole("button", { name: "Ahora no" }).click();
    await expect(page.getByRole("link", { name: /Abierta con novedades/ })).toBeVisible();
    const historial = page.locator("table");
    await expect(historial.getByRole("row").nth(1)).toContainText("Abierta con novedades");
    await expect(historial.getByRole("row").nth(1)).toContainText("Paro de transporte");
    await expect(historial.getByRole("row").nth(1)).toContainText(seededUsers.bedel.name);

    // Un solo aviso: el indicador con el motivo, sin banner, en una pantalla de clases y en otra que no lo es.
    const indicador = page.getByRole("link", { name: /Abierta con novedades, Paro de transporte/ });
    for (const ruta of ["/clases", "/novedades"]) {
      await page.goto(ruta);
      await expect(indicador).toBeVisible();
      await expect(indicador).toContainText("Paro de transporte: las clases se dictan");
      const titulo = page.locator("header h1");
      expect(await titulo.evaluate((h1) => h1.scrollWidth <= h1.clientWidth)).toBe(true);
      await expect(page.locator("[data-slot=alert]")).toHaveCount(0);
    }
    await sinAvisosVigentes(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/estado-institucional");
    const badge = indicador.locator("[data-estado]");
    await expect(badge).toBeVisible();
    await expect(indicador.getByText("Paro de transporte")).toBeHidden();
    await expectBadgeDentroDelEncabezado(page);
    await expectNoHorizontalPageScroll(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/estado-institucional");

    // Se deja la institución como estaba para el resto de la suite.
    await page.getByLabel("Nuevo estado").selectOption("ABIERTA");
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByText("Estado registrado").last()).toBeVisible();
    await expect(page.getByRole("link", { name: /Institución abierta/ })).toBeVisible();
  });

  test("el docente publica una demora, el estudiante la ve en su clase y el docente la finaliza", async ({
    page,
  }) => {
    const fecha = proximaClaseDeProyectoFinal();
    const mensaje = `Arranco 19:15 (${Date.now().toString(36)})`;

    await loginViaUi(page, seededUsers.docente);
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Acciones rápidas" })).toHaveCount(0);
    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    const dialog = page.getByRole("dialog", { name: "Publicar novedad" });
    await dialog.getByLabel("Fecha de las clases").fill(fecha);
    await dialog.getByRole("checkbox", { name: /Proyecto Final · 5K2/ }).check();
    await dialog.getByRole("button", { name: "Demora" }).click();
    await dialog.getByLabel("Minutos estimados de demora").fill("15");
    await dialog.getByLabel(/Mensaje para los estudiantes/).fill(mensaje);
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Novedad publicada")).toBeVisible();
    await logoutViaUi(page);

    await loginViaUi(page, seededUsers.estudiante);
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await page.goto("/clases");
    await page.getByLabel("Fecha").fill(fecha);
    const clase = page
      .locator('[data-slot="item"]')
      .filter({ hasText: "Proyecto Final" })
      .filter({ hasText: "5K2" });
    await expect(clase).toContainText("Demorada 15 min");
    await expect(clase).toContainText(mensaje);
    await clase.click();
    const detalle = page.getByRole("dialog");
    await expect(detalle).toContainText(seededUsers.docente.name);
    await expect(detalle).toContainText(mensaje);
    await page.keyboard.press("Escape");
    await logoutViaUi(page);

    await loginViaUi(page, seededUsers.docente);
    await page.goto("/novedades");
    const novedad = page.locator('[data-slot="item"]').filter({ hasText: mensaje });
    await expect(novedad).toContainText("Activa");
    await expect(novedad).toContainText(`${formatoCorto(fecha)} 19:00`);
    await novedad.getByRole("button", { name: /Acciones de la novedad/ }).click();
    await page.getByRole("menuitem", { name: "Finalizar novedad" }).click();
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page.getByText("Novedad finalizada")).toBeVisible();
    await expect(novedad).toHaveCount(0);
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(novedad).toContainText("Finalizada");

    await page.goto("/clases");
    await page.getByLabel("Fecha").fill(fecha);
    await expect(clase).toContainText("Programada");
  });

  test("un estudiante nuevo elige sus comisiones y ve sus clases", async ({ page }) => {
    const user = newUser();
    await registerViaUi(page, user);
    await verifyEmailViaLink(page, user);
    await expect(page.getByText("Todavía no seguís ninguna comisión")).toBeVisible();

    await page.getByRole("link", { name: "Elegir comisiones" }).click();
    await expect(page).toHaveURL(/\/mi-cuenta\/comisiones/);
    await page
      .getByLabel("Carrera")
      .selectOption({ label: "Ingeniería en Sistemas de Información" });
    await page.getByLabel("Año").selectOption("5");
    await page.getByLabel("Materia").selectOption({ label: "Proyecto Final" });
    await page.getByRole("button", { name: "Agregar 5K2 de Proyecto Final" }).click();
    await expect(
      page.getByRole("button", { name: "Agregar 5K2 de Proyecto Final" }),
    ).toBeDisabled();
    await expect(page.getByText("Comisión agregada")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "Quitar" })).toHaveCount(1);

    await page.getByRole("link", { name: "Mis clases" }).click();
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await expect(page.getByText(/\d+ clases? · 5K2/)).toBeVisible();
    await expect(page.getByText("Todavía no seguís ninguna comisión")).toHaveCount(0);

    await page.goto("/mi-cuenta/comisiones");
    await page.getByRole("button", { name: "Quitar" }).click();
    await expect(page.getByText("Comisión quitada")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Quitar" })).toHaveCount(0);
    await page.getByRole("link", { name: "Mis clases" }).click();
    await expect(page.getByText("Todavía no seguís ninguna comisión")).toBeVisible();
  });
});
