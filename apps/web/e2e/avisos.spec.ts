import type { Locator } from "@playwright/test";

import {
  expect,
  expectBadgeDentroDelEncabezado,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

// Fecha `dd/mm/aaaa` y hora 24 h en hora argentina, a `minutos` de ahora.
const enMinutos = (minutos: number) => {
  const [fecha, hora] = new Date(Date.now() + minutos * 60_000 - 3 * 60 * 60_000)
    .toISOString()
    .slice(0, 16)
    .split("T") as [string, string];
  return { fecha: fecha.split("-").reverse().join("/"), hora };
};

const cargarVigencia = async (dialog: Locator, campo: "Desde" | "Hasta", minutos: number) => {
  const { fecha, hora } = enMinutos(minutos);
  await dialog.getByLabel(campo, { exact: true }).fill(fecha);
  await dialog.getByLabel(campo === "Desde" ? "Hora de inicio" : "Hora de fin").fill(hora);
};

test.describe("Avisos institucionales", () => {
  test("el bedel valida, publica un urgente con correo y lo ve en todos lados", async ({
    page,
    browser,
    baseURL,
  }) => {
    const titulo = `QA urgente ${Date.now().toString(36)}`;
    const avisoItem = page.locator("[data-slot=item]", { hasText: titulo });
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/avisos");
    await page.getByRole("button", { name: "Nuevo aviso" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo aviso" });

    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(dialog.getByText("Ingresá el título")).toBeVisible();
    await expect(dialog.getByText("Ingresá el cuerpo del aviso")).toBeVisible();
    await expect(dialog.getByText("Indicá hasta cuándo está vigente")).toBeVisible();
    await expect(dialog.getByText("Elegí al menos un destinatario")).toHaveCount(0);

    await dialog.getByRole("checkbox", { name: "Todos" }).click();
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(dialog.getByText("Elegí al menos un destinatario")).toBeVisible();

    await dialog.getByLabel("Título").fill(titulo);
    await dialog.getByLabel("Cuerpo").fill("Prueba");
    await dialog.getByLabel("Prioridad").selectOption("URGENTE");
    await dialog.getByRole("checkbox", { name: "Bedel" }).click();
    await cargarVigencia(dialog, "Hasta", -60);
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(dialog.getByText("La vigencia tiene que terminar en el futuro")).toBeVisible();

    await cargarVigencia(dialog, "Desde", 24 * 60);
    await cargarVigencia(dialog, "Hasta", 23 * 60);
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(
      dialog.getByText("La vigencia tiene que terminar después de empezar"),
    ).toBeVisible();

    await cargarVigencia(dialog, "Desde", -1);
    await cargarVigencia(dialog, "Hasta", 10);
    await dialog.getByRole("switch", { name: "Enviar por correo" }).click();
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Aviso publicado")).toBeVisible();

    await expect(avisoItem).toBeVisible();
    await expect(avisoItem.getByText("Urgente", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(avisoItem).toHaveCount(0);
    await page.getByRole("tab", { name: "Publicados" }).click();
    await expect(avisoItem).toBeVisible();
    await expect(avisoItem.getByText("Urgente", { exact: true })).toBeVisible();

    // Si un reintento dejó otro urgente vigente, el indicador resume la cantidad.
    await expect(
      page.getByRole("link", { name: new RegExp(`Aviso urgente: ${titulo}|\\d+ avisos urgentes`) }),
    ).toBeVisible();
    await page.goto("/estado-institucional");
    await expect(page.getByText("Historial", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(`Aviso urgente: ${titulo}|\\d+ avisos urgentes`) }),
    ).toBeVisible();
    const tarjetas = page.locator("[data-slot=card]");
    await expect(tarjetas.filter({ hasText: "Avisos vigentes" })).toHaveCount(0);
    await expect(tarjetas.filter({ hasText: titulo })).toHaveCount(0);

    await page.goto("/avisos");
    await page.getByRole("tab", { name: "Publicados" }).click();
    await expect(async () => {
      await page.getByRole("button", { name: "Resultado de envíos" }).first().click();
      const envios = page.getByRole("dialog", { name: "Resultado de envíos" });
      await expect(envios.getByText(seededUsers.bedel.email)).toBeVisible({ timeout: 2_000 });
      await expect(envios.getByText(/^(Pendiente|Enviado)$/)).toBeVisible({ timeout: 2_000 });
    }).toPass();

    const estudiante = await browser.newContext({ baseURL });
    const paginaEstudiante = await estudiante.newPage();
    await loginViaUi(paginaEstudiante, seededUsers.estudiante);
    await paginaEstudiante.goto("/avisos");
    await expect(paginaEstudiante.getByRole("tab", { name: "Vigentes" })).toBeVisible();
    await expect(paginaEstudiante.locator("[data-slot=item]", { hasText: titulo })).toHaveCount(0);
    await expect(paginaEstudiante.getByRole("button", { name: "Nuevo aviso" })).toHaveCount(0);
    await estudiante.close();
  });

  test("al cerrar la institución se ofrece el aviso precargado y 'Ahora no' solo cierra", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/estado-institucional");
    await page.getByLabel("Nuevo estado").selectOption("ABIERTA_CON_NOVEDADES");
    await page.getByLabel(/Motivo/).fill("Paro de transporte");
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByText("Estado registrado")).toBeVisible();
    const oferta = page.getByRole("alertdialog", { name: "¿Generar un aviso institucional?" });
    await oferta.getByRole("button", { name: "Ahora no" }).click();
    await expect(oferta).toHaveCount(0);
    await expect(page).toHaveURL(/\/estado-institucional/);

    await page.getByLabel("Nuevo estado").selectOption("CERRADA");
    await page.getByLabel(/Motivo/).fill("Corte de energía");
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await page.getByRole("button", { name: "Cerrar la institución" }).click();
    await page
      .getByRole("alertdialog", { name: "¿Generar un aviso institucional?" })
      .getByRole("button", { name: "Generar aviso" })
      .click();

    const nuevo = page.getByRole("dialog", { name: "Nuevo aviso" });
    await expect(nuevo.getByLabel("Título")).toHaveValue("Institución cerrada");
    await expect(nuevo.getByLabel("Cuerpo")).toHaveValue("Corte de energía");
    await expect(nuevo.getByLabel("Prioridad")).toHaveValue("URGENTE");
    await expect(nuevo.getByRole("checkbox", { name: "Todos" })).toBeChecked();
    await nuevo.getByRole("button", { name: "Cancelar" }).click();

    for (const ruta of ["/clases", "/novedades"]) {
      await page.goto(ruta);
      const indicador = page.getByRole("link", {
        name: /Institución cerrada, Corte de energía, actualizado/,
      });
      await expect(indicador).toBeVisible();
      await expect(indicador.getByText("Corte de energía")).toBeVisible();
      await expect(page.locator("[data-slot=alert]")).toHaveCount(0);
    }

    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/estado-institucional");
    await expect(page.locator("header [data-estado=CERRADA]")).toBeVisible();
    await expectBadgeDentroDelEncabezado(page);
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.getByLabel("Nuevo estado").selectOption("ABIERTA");
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByRole("link", { name: /Institución abierta/ })).toBeVisible();
  });
});
