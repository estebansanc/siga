import type { Page } from "@playwright/test";

import { crearNovedadesDeHistorial } from "./support/clase-de-hoy";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

const item = (page: Page, texto: string) =>
  page.locator('[data-slot="item"]').filter({ hasText: texto });

const crearAula = async (page: Page) => {
  const codigo = `Aula Hist ${Date.now().toString(36)}`;
  const aula = await page.request.post("/api/v1/aulas", {
    data: { codigo, edificio: "Edificio C", piso: "PB", capacidad: 30 },
  });
  return { codigo, id: ((await aula.json()) as { id: string }).id };
};

test.describe("Novedades: Activas e Historial", () => {
  test("el Bedel ve cada novedad en una sola pestaña, finaliza sin recargar y consulta el Historial", async ({
    page,
  }) => {
    const { marca, limpiar } = await crearNovedadesDeHistorial();
    try {
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/novedades");
      await expect(page.getByRole("tab", { name: "Activas", selected: true })).toBeVisible();
      await expect(
        item(page, `Activa propia ${marca}`).or(page.getByText("Sin novedades")),
      ).toBeVisible();
      await expect(page.getByText(`Finalizada propia ${marca}`)).toHaveCount(0);

      const activa = item(page, `Activa propia ${marca}`);
      await activa.getByRole("button", { name: /Acciones de la novedad/ }).click();
      await page.getByRole("menuitem", { name: "Finalizar novedad" }).click();
      await page.getByRole("button", { name: "Finalizar" }).click();
      await expect(page.getByText("Novedad finalizada")).toBeVisible();
      await expect(activa).toHaveCount(0);

      await page.getByRole("tab", { name: "Historial" }).click();
      await expect(page.getByRole("button", { name: "Publicar novedad" })).toHaveCount(0);
      const finalizada = item(page, `Activa propia ${marca}`);
      await expect(finalizada).toContainText("Finalizada");
      await expect(finalizada.getByRole("button", { name: /Acciones/ })).toHaveCount(0);
      await expect(page.getByLabel("Indicadores")).toContainText("Demora");
      await expectNoHorizontalPageScroll(page);
    } finally {
      await limpiar();
    }
  });

  test("valida el rango, acepta 12 meses justos y pagina de a 20", async ({ page }) => {
    const { limpiar } = await crearNovedadesDeHistorial();
    try {
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/novedades");
      await page.getByRole("tab", { name: "Historial" }).click();
      const consultar = page.getByRole("button", { name: "Consultar" });

      await expect(page.getByText("Página 1 de")).toContainText(/Página 1 de [2-9]/);
      await expect(page.locator('[data-slot="item"]')).toHaveCount(20);
      const total = await page.getByLabel("Indicadores").textContent();

      await page.getByLabel("Desde").fill("2026-03-02");
      await page.getByLabel("Hasta").fill("2026-03-01");
      await consultar.click();
      await expect(
        page.getByText("La fecha desde no puede ser posterior a la fecha hasta"),
      ).toBeVisible();
      await expect(page.getByLabel("Indicadores")).toHaveText(total ?? "");

      await page.getByLabel("Desde").fill("2020-01-01");
      await page.getByLabel("Hasta").fill("2021-01-02");
      await consultar.click();
      await expect(
        page.getByText("El rango de fechas no puede superar los 12 meses"),
      ).toBeVisible();
      await expect(page.getByLabel("Indicadores")).toHaveText(total ?? "");

      await page.getByLabel("Hasta").fill("2021-01-01");
      await consultar.click();
      await expect(page.getByText(/no puede superar/)).toHaveCount(0);

      await page
        .getByLabel("Desde")
        .fill(new Date(Date.now() - 86_400_000).toISOString().slice(0, 10));
      await page
        .getByLabel("Hasta")
        .fill(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
      await consultar.click();
      await page.getByRole("button", { name: "Página siguiente" }).click();
      await expect(page.getByText(/Página 2 de/)).toBeVisible();
    } finally {
      await limpiar();
    }
  });

  test("el Docente solo ve las novedades de sus comisiones, en Activas y en Historial", async ({
    page,
  }) => {
    const { marca, limpiar } = await crearNovedadesDeHistorial();
    try {
      await loginViaUi(page, seededUsers.docente);
      await page.goto("/novedades");
      await expect(item(page, `Activa propia ${marca}`)).toBeVisible();
      await expect(page.getByText(`Activa ajena ${marca}`)).toHaveCount(0);

      await page.getByRole("tab", { name: "Historial" }).click();
      await expect(item(page, `Finalizada propia ${marca}`)).toBeVisible();
      await expect(page.getByText(`Finalizada ajena ${marca}`)).toHaveCount(0);
    } finally {
      await limpiar();
    }
  });

  test("la Autoridad ve Novedades e Incidencias tras Clases y no modifica nada", async ({
    page,
  }) => {
    const { marca, limpiar } = await crearNovedadesDeHistorial();
    try {
      await loginViaUi(page, seededUsers.autoridad);
      const enlaces = await page.locator('[data-slot="sidebar-menu-button"]').allTextContents();
      expect(enlaces.map((texto) => texto.trim()).slice(1, 4)).toEqual([
        "Clases",
        "Estado institucional",
        "Novedades",
      ]);

      await page.getByRole("link", { name: "Novedades" }).click();
      await expect(item(page, `Activa ajena ${marca}`)).toBeVisible();
      await expect(page.getByRole("button", { name: "Publicar novedad" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Acciones de la novedad/ })).toHaveCount(0);

      await page.getByRole("link", { name: "Incidencias" }).click();
      await expect(page.getByRole("tab", { name: "Abiertas", selected: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Nueva incidencia" })).toHaveCount(0);
      expect((await page.request.post("/api/v1/incidencias", { data: {} })).status()).toBe(403);
    } finally {
      await limpiar();
    }
  });

  test("Consultas históricas queda solo con Asistencia docente y Uso de aulas", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.autoridad);
    await page.goto("/historico");
    await expect(page.getByRole("tab")).toHaveText(["Asistencia docente", "Uso de aulas"]);
    expect(
      (
        await page.request.get("/api/v1/historico/novedades?desde=2026-01-01&hasta=2026-01-31")
      ).status(),
    ).toBe(404);
  });
});

test.describe("Incidencias: Abiertas e Historial", () => {
  test("una incidencia resuelta pasa al Historial sin recargar, con su detalle de estados", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    const aula = await crearAula(page);
    const otra = await crearAula(page);
    for (const { id } of [aula, otra]) {
      await page.request.post("/api/v1/incidencias", {
        data: { aulaId: id, elemento: "PROYECTOR", descripcion: "No enciende", gravedad: "LEVE" },
      });
    }

    await page.goto("/incidencias");
    await expect(page.getByRole("tab", { name: "Abiertas", selected: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resuelta" })).toHaveCount(0);
    const abierta = item(page, `${aula.codigo} · Proyector`);
    await abierta.getByRole("button", { name: "Detalle" }).click();
    const detalle = page.getByRole("dialog", { name: `${aula.codigo} · Proyector` });
    await detalle.getByRole("button", { name: "Pasar a En curso" }).click();
    await page
      .getByRole("dialog", { name: "Pasar incidencia a En curso" })
      .getByRole("button", { name: "Pasar a En curso" })
      .click();
    await expect(page.getByText("Incidencia en curso")).toBeVisible();
    await expect(detalle.getByRole("button", { name: "Resolver" })).toBeVisible();

    await detalle.getByRole("button", { name: "Resolver" }).click();
    await page
      .getByRole("dialog", { name: "Resolver incidencia" })
      .getByRole("button", { name: "Resolver" })
      .click();
    await expect(page.getByText("Incidencia resuelta")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(abierta).toHaveCount(0);

    await page.getByRole("tab", { name: "Historial" }).click();
    await page.getByLabel("Aula", { exact: true }).selectOption({ value: aula.id });
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByLabel("Indicadores")).toContainText("Total1");
    const resuelta = item(page, `${aula.codigo} · Proyector`);
    await expect(resuelta).toContainText("Resuelta");
    await expectNoHorizontalPageScroll(page);

    await resuelta.getByRole("button", { name: "Detalle" }).click();
    const historial = page.getByRole("dialog", { name: `${aula.codigo} · Proyector` });
    for (const estado of ["Abierta", "En curso", "Resuelta"]) {
      await expect(historial.getByText(estado, { exact: true }).first()).toBeVisible();
    }
    await expect(historial.getByRole("button", { name: /Resolver|Pasar a/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.getByLabel("Aula", { exact: true }).selectOption({ value: otra.id });
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(page.getByText("Sin registros para el período")).toBeVisible();

    await page.getByLabel("Desde").fill("2026-03-02");
    await page.getByLabel("Hasta").fill("2026-03-01");
    await page.getByRole("button", { name: "Consultar" }).click();
    await expect(
      page.getByText("La fecha desde no puede ser posterior a la fecha hasta"),
    ).toBeVisible();

    for (const { id } of [aula, otra]) await page.request.post(`/api/v1/aulas/${id}/baja`);
  });

  test("la Autoridad consulta el detalle de una incidencia abierta sin acciones", async ({
    page,
    browser,
    baseURL,
  }) => {
    const bedel = await browser.newContext({ baseURL });
    const paginaBedel = await bedel.newPage();
    await loginViaUi(paginaBedel, seededUsers.bedel);
    const aula = await crearAula(paginaBedel);
    await paginaBedel.request.post("/api/v1/incidencias", {
      data: {
        aulaId: aula.id,
        elemento: "PROYECTOR",
        descripcion: "Falla",
        gravedad: "IMPIDE_USO",
      },
    });

    await loginViaUi(page, seededUsers.autoridad);
    await page.goto("/incidencias");
    await item(page, `${aula.codigo} · Proyector`).getByRole("button", { name: "Detalle" }).click();
    const detalle = page.getByRole("dialog", { name: `${aula.codigo} · Proyector` });
    await expect(detalle.getByText("Falla")).toBeVisible();
    await expect(detalle.getByRole("button", { name: /Resolver|Pasar a/ })).toHaveCount(0);

    await paginaBedel.request.post(`/api/v1/aulas/${aula.id}/baja`);
    await bedel.close();
  });
});
