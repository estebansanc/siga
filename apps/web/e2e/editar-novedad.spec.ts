import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const fechaArgentina = (instante: Date) =>
  new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// La segunda clase de Proyecto Final 5K2 (lunes o jueves) desde mañana: otra que la del flujo
// principal, para que los tests no se pisen.
const segundaClaseDeProyectoFinal = () => {
  const dia = new Date();
  let encontradas = 0;
  while (encontradas < 2) {
    dia.setDate(dia.getDate() + 1);
    if ([1, 4].includes(new Date(`${fechaArgentina(dia)}T12:00:00Z`).getUTCDay())) encontradas++;
  }
  return fechaArgentina(dia);
};

test.describe("Editar una novedad", () => {
  test("el bedel edita una Demora y el estudiante la ve sin recargar, con el historial", async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(150_000);
    const fecha = segundaClaseDeProyectoFinal();
    const marca = Date.now().toString(36);
    const mensajeNuevo = `Ahora 19:25 (${marca})`;

    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    const publicar = page.getByRole("dialog", { name: "Publicar novedad" });
    await publicar.getByLabel("Fecha de las clases").fill(fecha);
    await publicar.getByRole("checkbox", { name: /Proyecto Final · 5K2/ }).check();
    await publicar.getByRole("button", { name: "Demora" }).click();
    await publicar.getByLabel("Minutos estimados de demora").fill("10");
    await publicar.getByLabel(/Mensaje para los estudiantes/).fill(`Arranco 19:10 (${marca})`);
    await publicar.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Novedad publicada")).toBeVisible();

    const estudiante = await browser.newContext({ baseURL });
    const paginaEstudiante = await estudiante.newPage();
    await loginViaUi(paginaEstudiante, seededUsers.estudiante);
    await paginaEstudiante.goto("/clases");
    await paginaEstudiante.getByLabel("Fecha").fill(fecha);
    const clase = paginaEstudiante
      .locator('[data-slot="item"]')
      .filter({ hasText: "Proyecto Final" })
      .filter({ hasText: "5K2" });
    await expect(clase).toContainText("Demorada 10 min");

    const novedad = page.locator('[data-slot="item"]').filter({ hasText: marca });
    await novedad.getByRole("button", { name: /Acciones de la novedad/ }).click();
    await page.getByRole("menuitem", { name: "Editar novedad" }).click();
    const editar = page.getByRole("dialog", { name: /Editar novedad/ });
    await expect(editar.getByLabel("Minutos estimados de demora")).toHaveValue("10");
    await editar.getByLabel("Minutos estimados de demora").fill("25");
    await editar.getByLabel(/Mensaje para los estudiantes/).fill(mensajeNuevo);
    await editar.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Novedad actualizada")).toBeVisible();
    await expect(
      page.locator('[data-slot="item"]').filter({ hasText: mensajeNuevo }),
    ).toContainText("25 min");

    await expect(clase).toContainText("Demorada 25 min", { timeout: 70_000 });
    await expect(clase).toContainText(mensajeNuevo);
    await clase.click();
    const detalle = paginaEstudiante.getByRole("dialog");
    await expect(detalle).toContainText("Demora · 10 min");
    await expect(detalle).toContainText("Novedad editada · 25 min");
    await expect(detalle).toContainText("bedelía");
    await estudiante.close();

    await novedad.getByRole("button", { name: /Acciones de la novedad/ }).click();
    await page.getByRole("menuitem", { name: "Finalizar novedad" }).click();
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page.getByText("Novedad finalizada")).toBeVisible();
    await expect(novedad).toHaveCount(0);
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(novedad).toContainText("Finalizada");
    await expect(novedad.getByRole("button", { name: /Acciones de la novedad/ })).toHaveCount(0);
  });
});
