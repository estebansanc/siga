import { crearClaseSinAulaProxima, eliminarClaseSinAula } from "./support/clase-de-hoy";
import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const fechaArgentina = (instante: Date) =>
  new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

const haceDias = (dias: number) =>
  fechaArgentina(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));

test.describe("Consultas históricas", () => {
  test("la Autoridad consulta con el rango precargado, ve los errores y un período sin registros", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.autoridad);
    await page.getByRole("link", { name: "Consultas históricas" }).click();
    await expect(page.getByRole("heading", { name: "Consultas históricas" })).toBeVisible();
    await expect(page.getByText("Próximamente")).toHaveCount(0);
    await expect(page.getByLabel("Desde")).toHaveValue(haceDias(30));
    await expect(page.getByLabel("Hasta")).toHaveValue(haceDias(0));
    await expect(page.getByLabel("Indicadores")).toContainText("Clases sin registro");

    const consultar = page.getByRole("button", { name: "Consultar" });
    await page.getByLabel("Desde").fill("");
    await consultar.click();
    await expect(page.getByText("Ingresá la fecha desde")).toBeVisible();
    await page.getByLabel("Hasta").fill("");
    await consultar.click();
    await expect(page.getByText("Ingresá la fecha hasta")).toBeVisible();

    await page.getByLabel("Desde").fill("2020-03-02");
    await page.getByLabel("Hasta").fill("2020-03-01");
    await consultar.click();
    await expect(
      page.getByText("La fecha desde no puede ser posterior a la fecha hasta"),
    ).toBeVisible();

    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByLabel("Hasta").fill("2021-01-02");
    await consultar.click();
    await expect(page.getByText("El rango de fechas no puede superar los 12 meses")).toBeVisible();

    await page.getByLabel("Hasta").fill("2021-01-01");
    await consultar.click();
    await expect(page.getByText("El rango de fechas no puede superar los 12 meses")).toHaveCount(0);
    await expect(page.getByText("Sin registros para el período")).toBeVisible();
    await expect(page.getByLabel("Indicadores")).toContainText("Registros manuales0");
  });

  test("la Autoridad elige Novedades y ve sus indicadores", async ({ page }) => {
    await loginViaUi(page, seededUsers.autoridad);
    await page.goto("/historico");
    await expect(
      page.getByRole("tab", { name: "Asistencia docente", selected: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Novedades" }).click();
    await expect(page.getByLabel("Tipo de novedad")).toBeVisible();
    await expect(page.getByLabel("Indicadores")).toContainText("Total");
  });

  test("el Bedel arranca en Uso de aulas, no ve Novedades y la API se las niega", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.getByRole("link", { name: "Consultas históricas" }).click();
    await expect(page.getByRole("heading", { name: "Consultas históricas" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Uso de aulas", selected: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Novedades" })).toHaveCount(0);
    await expect(page.getByLabel("Ocupación general")).toBeVisible();

    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("El rango de fechas no puede superar los 12 meses")).toBeVisible();

    const novedades = await page.request.get(
      "/api/v1/historico/novedades?desde=2026-01-01&hasta=2026-01-31",
    );
    expect(novedades.status()).toBe(403);
    expect((await novedades.json()).error.message).toBe("Acceso denegado");
  });

  test("el Bedel asigna un aula en Solicitudes y la ve en Uso de aulas", async ({ page }) => {
    const { aulaId, aulaCodigo, claseId, fecha } = await crearClaseSinAulaProxima();
    try {
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/solicitudes");
      await page.getByRole("tab", { name: "Clases sin aula" }).click();
      const clase = page
        .locator('[data-slot="item"]')
        .filter({ hasText: /Proyecto Final · 5K2/ })
        .filter({ hasText: fecha.split("-").reverse().join("/") });
      await clase.getByRole("button", { name: "Asignar aula" }).click();
      const dialog = page.getByRole("dialog", { name: "Asignar aula" });
      await dialog.getByLabel("Aula").selectOption({ value: aulaId });
      await dialog.getByRole("button", { name: "Asignar" }).click();
      await expect(page.getByText("Aula asignada")).toBeVisible();

      await page.goto("/historico");
      await page.getByLabel("Hasta").fill(fecha);
      await page.getByLabel("Aula", { exact: true }).selectOption({ label: aulaCodigo });
      await page.getByRole("button", { name: "Consultar" }).click();

      await expect(page.getByLabel("Ocupación general")).toContainText("1 h ocupadas");
      const ocupacion = page.getByRole("table", { name: "Ocupación por aula" });
      await expect(ocupacion.getByRole("row", { name: new RegExp(aulaCodigo) })).toBeVisible();
      const asignacion = page.getByRole("table", { name: "Asignaciones" }).getByRole("row").nth(1);
      await expect(asignacion).toContainText(aulaCodigo);
      await expect(asignacion).toContainText("Asignación de bedelía");
      await expect(asignacion).toContainText(seededUsers.bedel.name);
    } finally {
      await eliminarClaseSinAula(claseId, aulaId);
    }
  });

  test("Uso de aulas sin clases ni asignaciones dice Sin registros para el período", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/historico");
    await page.getByLabel("Desde").fill("2020-01-01");
    await page.getByLabel("Hasta").fill("2020-01-31");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("Sin registros para el período")).toBeVisible();
  });

  test("el Docente no ve la opción y la API le niega la asistencia", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await expect(page.getByRole("link", { name: "Consultas históricas" })).toHaveCount(0);
    await page.goto("/historico");
    await expect(page).toHaveURL(/\/$/);

    const respuesta = await page.request.get(
      "/api/v1/historico/asistencias?desde=2026-01-01&hasta=2026-01-31",
    );
    expect(respuesta.status()).toBe(403);
    expect((await respuesta.json()).error.message).toBe("Acceso denegado");
  });
});
