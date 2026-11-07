import path from "node:path";

import type { Page } from "@playwright/test";

import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

const planoDePrueba = path.resolve(process.cwd(), "../../docs/producto/planos/ejemplo-piso.png");

const abrirAsistente = async (page: Page) => {
  await loginViaUi(page, seededUsers.bedel);
  await page.goto("/aulas");
  await page.getByRole("button", { name: "Importar desde plano" }).click();
  return page.getByRole("dialog", { name: "Importar desde plano" });
};

test.describe("Importar aulas desde el plano", () => {
  test("rechaza un archivo que no es PDF, PNG o JPG", async ({ page }) => {
    const dialog = await abrirAsistente(page);
    await expect(dialog).toContainText("Paso 1 de 4");
    await dialog.getByLabel("Archivo del plano").setInputFiles({
      name: "plano.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("no es un plano"),
    });
    await expect(dialog).toContainText("El plano debe ser un PDF, PNG o JPG de hasta 20 MB");
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog).toContainText("Paso 1 de 4");
    await expectNoHorizontalPageScroll(page);
  });

  test("sin almacenamiento muestra el aviso y no avanza", async ({ page }) => {
    const dialog = await abrirAsistente(page);
    await dialog.getByLabel("Edificio").fill("Edificio A");
    await dialog.getByLabel("Piso", { exact: true }).fill("2.º piso");
    await dialog.getByLabel("Piso", { exact: true }).press("Tab");
    await dialog.getByLabel("Archivo del plano").setInputFiles(planoDePrueba);
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog).toContainText(
      "No se puede importar desde plano: el almacenamiento de archivos no está configurado.",
    );
    await expect(dialog).toContainText("Paso 1 de 4");
  });

  test("el Docente no ve la importación: /aulas lo lleva a sus solicitudes", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/aulas");
    await expect(page).toHaveURL(/\/solicitudes$/);
    await expect(page.getByRole("button", { name: "Importar desde plano" })).toHaveCount(0);
  });

  test("el asistente cabe en 375 px de ancho en los cuatro pasos", async ({ page }) => {
    const imagen =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'/>";
    const plano = {
      id: "p1",
      edificio: "Edificio A",
      piso: "2.º piso",
      ancho: 800,
      alto: 600,
      imagenUrl: imagen,
      aulasUbicadas: 0,
    };
    const cuadro = (x: number) => [
      { x, y: 0.1 },
      { x: x + 0.2, y: 0.1 },
      { x: x + 0.2, y: 0.4 },
      { x, y: 0.4 },
    ];
    await page.route("**/api/v1/planos/imagen", (route) =>
      route.fulfill({
        status: 201,
        json: { key: "o/planos/x.png", uploadUrl: "https://r2.test/up" },
      }),
    );
    await page.route("https://r2.test/up", (route) => route.fulfill({ status: 200 }));
    await page.route(/\/api\/v1\/planos$/, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 201, json: plano })
        : route.fallback(),
    );
    await page.route("**/api/v1/planos/p1/deteccion", (route) =>
      route.fulfill({
        json: {
          aulas: [
            { nombre: "Aula 21", confianza: 0.9, poligono: cuadro(0.1) },
            { nombre: null, confianza: 0.9, poligono: cuadro(0.5) },
          ],
        },
      }),
    );
    await page.setViewportSize({ width: 375, height: 800 });
    const dialog = await abrirAsistente(page);
    await expectNoHorizontalPageScroll(page);

    await dialog.getByLabel("Edificio").fill("Edificio A");
    await dialog.getByLabel("Piso", { exact: true }).fill("2.º piso");
    await dialog.getByLabel("Piso", { exact: true }).press("Tab");
    await dialog.getByLabel("Archivo del plano").setInputFiles(planoDePrueba);
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog).toContainText("Paso 2 de 4");
    await expectNoHorizontalPageScroll(page);

    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog).toContainText("Paso 3 de 4");
    await expectNoHorizontalPageScroll(page);

    await dialog.getByLabel("Capacidad por defecto").fill("40");
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog).toContainText("Paso 4 de 4");
    await expectNoHorizontalPageScroll(page);
  });
});
