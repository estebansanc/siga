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

  test("el asistente cabe en 375 px de ancho", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await abrirAsistente(page);
    await expectNoHorizontalPageScroll(page);
  });
});
