import type { Page } from "@playwright/test";

import {
  crearClaseDeHoyConAula,
  eliminarClaseConAula,
  incidenciasDelAula,
} from "./support/clase-de-hoy";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

type AulaCreada = { id: string; codigo: string };

const crearAula = async (page: Page): Promise<AulaCreada> => {
  const codigo = `Aula Inc ${Date.now().toString(36)}`;
  const response = await page.request.post("/api/v1/aulas", {
    data: { codigo, edificio: "Edificio C", piso: "PB", capacidad: 30 },
  });
  expect(response.status()).toBe(201);
  return { id: ((await response.json()) as { id: string }).id, codigo };
};

const estadoDelAula = async (page: Page, id: string) => {
  const response = await page.request.get(`/api/v1/aulas/${id}`);
  return ((await response.json()) as { estado: string }).estado;
};

test.describe("Incidencias de aulas", () => {
  test("el bedel reporta, propone Fuera de servicio, avanza el estado y rehabilita el aula", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    const aula = await crearAula(page);
    await page.goto("/incidencias");
    await expect(page.getByRole("heading", { name: "Incidencias" }).first()).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.getByRole("button", { name: "Nueva incidencia" }).click();
    const reporte = page.getByRole("dialog", { name: "Nueva incidencia" });
    await reporte.getByLabel("Aula", { exact: true }).selectOption(aula.id);
    await reporte.getByLabel(/Foto/).setInputFiles({
      name: "plano.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF"),
    });
    await expect(reporte.getByText("La foto debe ser JPG o PNG")).toBeVisible();
    await reporte.getByRole("button", { name: "Reportar" }).click();
    await expect(reporte.getByText("Elegí el elemento afectado")).toBeVisible();
    await expect(reporte.getByText("Ingresá una descripción")).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await reporte.getByLabel(/Foto/).setInputFiles([]);
    await reporte.getByLabel("Elemento afectado").selectOption("PROYECTOR");
    await reporte.getByLabel("Descripción").fill("El proyector no enciende");
    await reporte.getByRole("radio", { name: "Impide el uso del aula" }).click();
    await reporte.getByRole("button", { name: "Reportar" }).click();
    await expect(page.getByText("Incidencia reportada")).toBeVisible();

    const propuesta = page.getByRole("alertdialog");
    await expect(propuesta.getByText(`¿Pasar ${aula.codigo} a Fuera de servicio?`)).toBeVisible();
    await propuesta.getByRole("button", { name: "Pasar a Fuera de servicio" }).click();
    await expect(page.getByText(`${aula.codigo} pasó a Fuera de servicio`)).toBeVisible();
    expect(await estadoDelAula(page, aula.id)).toBe("FUERA_DE_SERVICIO");

    const item = page
      .locator('[data-slot="item"]')
      .filter({ hasText: `${aula.codigo} · Proyector` });
    await expect(item).toContainText("Abierta");
    await expect(item).toContainText("Rosa Benítez");
    await item.getByRole("button", { name: "Detalle" }).click();
    const detalle = page.getByRole("dialog", { name: `${aula.codigo} · Proyector` });
    await detalle.getByRole("button", { name: "Pasar a En curso" }).click();
    const enCurso = page.getByRole("dialog", { name: "Pasar incidencia a En curso" });
    await enCurso.getByLabel(/Observaciones/).fill("Llamé al técnico");
    await enCurso.getByRole("button", { name: "Pasar a En curso" }).click();
    await expect(page.getByText("Incidencia en curso")).toBeVisible();
    await expect(detalle.getByText("Llamé al técnico")).toBeVisible();

    await detalle.getByRole("button", { name: "Resolver" }).click();
    const resolver = page.getByRole("dialog", { name: "Resolver incidencia" });
    await resolver.getByRole("checkbox", { name: /Rehabilitar el aula/ }).click();
    await resolver.getByRole("button", { name: "Resolver" }).click();
    await expect(page.getByText("Incidencia resuelta")).toBeVisible();
    await expect(detalle.getByRole("button", { name: "Resolver" })).toHaveCount(0);
    await expect(detalle.locator('[data-slot="item"]')).toHaveCount(3);
    expect(await estadoDelAula(page, aula.id)).toBe("DISPONIBLE");

    await page.keyboard.press("Escape");
    await expect(item).toHaveCount(0);
    await page.getByRole("button", { name: "Resuelta" }).click();
    await expect(item).toContainText("Resuelta");

    await page.request.post(`/api/v1/aulas/${aula.id}/baja`);
  });

  test("el detalle del aula lista sus incidencias y permite reportar una leve sin propuesta", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    const aula = await crearAula(page);
    await page.goto("/aulas");
    await page
      .locator('[data-slot="item"]')
      .filter({ hasText: aula.codigo })
      .getByRole("button", { name: "Detalle" })
      .click();
    const detalle = page.getByRole("dialog", { name: aula.codigo });
    await expect(detalle.getByText("Sin incidencias reportadas.")).toBeVisible();

    await detalle.getByRole("button", { name: "Reportar incidencia" }).click();
    const reporte = page.getByRole("dialog", { name: "Nueva incidencia" });
    await reporte.getByLabel("Elemento afectado").selectOption("ILUMINACION");
    await reporte.getByLabel("Descripción").fill("Falla un tubo");
    await reporte.getByRole("button", { name: "Reportar" }).click();
    await expect(page.getByText("Incidencia reportada")).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(detalle.getByText(`${aula.codigo} · Iluminación`)).toBeVisible();
    expect(await estadoDelAula(page, aula.id)).toBe("DISPONIBLE");

    await page.request.post(`/api/v1/aulas/${aula.id}/baja`);
  });

  for (const perfil of ["docente", "estudiante", "autoridad"] as const) {
    test(`${perfil} no ve ni gestiona Incidencias`, async ({ page }) => {
      await loginViaUi(page, seededUsers[perfil]);
      await expect(page.getByRole("link", { name: "Incidencias" })).toHaveCount(0);
      await page.goto("/incidencias");
      await expect(page).not.toHaveURL(/\/incidencias/);
      expect((await page.request.get("/api/v1/incidencias")).status()).toBe(403);
    });
  }

  test("el docente reporta una incidencia desde una clase suya con aula", async ({ page }) => {
    const { aulaId, aulaCodigo, claseId } = await crearClaseDeHoyConAula();
    try {
      await loginViaUi(page, seededUsers.docente);
      await page.goto("/");
      const tarjeta = page.locator(`[data-clase-id="${claseId}"]`);
      await tarjeta.getByRole("button", { name: /Reportar incidencia en/ }).click();
      const reporte = page.getByRole("dialog", { name: "Nueva incidencia" });
      await expect(reporte.getByLabel("Aula", { exact: true })).toHaveCount(0);
      await expect(reporte.getByText(new RegExp(`en ${aulaCodigo}`))).toBeVisible();
      await reporte.getByRole("button", { name: "Reportar" }).click();
      await expect(reporte.getByText("Elegí el elemento afectado")).toBeVisible();
      await expect(reporte.getByText("Ingresá una descripción")).toBeVisible();

      await reporte.getByLabel("Elemento afectado").selectOption("CLIMATIZACION");
      await reporte.getByLabel("Descripción").fill("El aire no enfría");
      await reporte.getByRole("button", { name: "Reportar" }).click();
      await expect(page.getByText("Incidencia reportada")).toBeVisible();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);

      const creadas = await incidenciasDelAula(aulaId);
      expect(creadas).toHaveLength(1);
      expect(creadas[0]).toMatchObject({
        estado: "ABIERTA",
        elemento: "CLIMATIZACION",
        reportadaPor: { email: seededUsers.docente.email },
      });
    } finally {
      await eliminarClaseConAula(claseId, aulaId);
    }
  });
});
