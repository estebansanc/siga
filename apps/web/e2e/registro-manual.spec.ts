import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

// Las clases pendientes terminan antes de las 23:00, así que un minuto más no cruza la medianoche.
const enUnMinuto = () =>
  new Date(Date.now() + 60_000 - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);

// Depende de las clases de hoy del seed: sin ninguna pendiente (fin de semana o ya de noche)
// el registro no tiene qué cargar y el test se saltea.
test.describe("Registro manual de asistencia", () => {
  test("el bedel registra la asistencia de una clase de hoy y la ve en el detalle", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/qr");
    await page.getByRole("button", { name: "Registrar asistencia manual" }).click();
    const dialog = page.getByRole("dialog", { name: "Registro manual" });
    await expect(dialog.getByLabel("Hora de llegada")).toHaveValue(/^\d{2}:\d{2}$/);

    const clases = dialog.getByLabel("Clase").locator("option:not([value=''])");
    const sinClases = dialog.getByText("No hay clases de hoy pendientes de asistencia");
    await expect(sinClases.or(clases.first())).toBeAttached();
    test.skip(await sinClases.isVisible(), "Hoy no quedan clases pendientes de asistencia");
    const etiqueta = (await clases.first().textContent()) ?? "";
    const [, materia = "", comision = ""] = etiqueta.match(/^(.+) (\S+) · \d{2}:\d{2}–/) ?? [];
    expect(materia).not.toBe("");
    await dialog.getByLabel("Clase").selectOption({ index: 1 });
    await expect(dialog.getByLabel("Docente")).not.toHaveValue("");

    await dialog.getByRole("button", { name: "Registrar asistencia" }).click();
    await expect(dialog.getByText("Ingresá el motivo del registro manual.")).toBeVisible();

    await dialog.getByLabel("Motivo").fill("Teléfono sin batería");
    await dialog.getByLabel("Hora de llegada").fill(enUnMinuto());
    await dialog.getByRole("button", { name: "Registrar asistencia" }).click();
    await expect(
      dialog.getByText("La hora de llegada no puede ser posterior a la hora actual."),
    ).toBeVisible();

    await dialog.getByLabel("Hora de llegada").fill("00:00");
    await dialog.getByRole("button", { name: "Registrar asistencia" }).click();
    await expect(
      page.getByText("Asistencia registrada. La clase quedó en Docente presente."),
    ).toBeVisible();
    await expect(dialog).toHaveCount(0);

    await page.getByRole("button", { name: "Registrar asistencia manual" }).click();
    await expect(
      page.getByRole("dialog").getByRole("option", { name: new RegExp(`^${materia} ${comision}`) }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.goto("/clases");
    const card = page.locator("[data-clase-id]").filter({ hasText: materia }).filter({
      hasText: comision,
    });
    await expect(card.first()).toContainText("Docente presente");
    await card.first().click();
    const detalle = page.getByRole("dialog", { name: new RegExp(materia) });
    await expect(detalle).toContainText(
      `Registro manual a las 00:00 por ${seededUsers.bedel.name}`,
    );
    await expect(detalle).toContainText("Teléfono sin batería");

    await page.goto("/historico");
    const fila = page
      .getByRole("row")
      .filter({ hasText: `${materia} · ${comision}` })
      .filter({ hasText: "Manual" });
    await expect(fila.first()).toContainText(`${seededUsers.bedel.name} (Bedelía)`);
    await expect(page.getByLabel("Indicadores")).toContainText("Registros manuales");
  });

  test("un docente no ve el botón: /qr lo devuelve al inicio", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/qr");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Registrar asistencia manual" })).toHaveCount(0);
  });
});
