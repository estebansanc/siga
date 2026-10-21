import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const fechaArgentina = (instante: Date) =>
  new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// El próximo lunes o jueves (desde mañana): Proyecto Final 5K2 se dicta esos días en el
// Aula 12 (seed) y una clase futura no depende de la hora a la que corre la suite.
const proximaClaseEnAula12 = () => {
  const dia = new Date();
  do {
    dia.setDate(dia.getDate() + 1);
  } while (![1, 4].includes(new Date(`${fechaArgentina(dia)}T12:00:00Z`).getUTCDay()));
  return fechaArgentina(dia);
};

test.describe("QR de asistencia", () => {
  test("el bedel genera el QR, ve las clases del turno y el código se renueva solo", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loginViaUi(page, seededUsers.bedel);
    await page.getByRole("link", { name: "QR de asistencia" }).click();
    await expect(page.getByRole("heading", { name: "QR de asistencia" })).toBeVisible();
    await expect(page.getByLabel("Fecha")).toHaveValue(fechaArgentina(new Date()));

    await page.getByLabel("Aula").selectOption({ label: "Aula 12" });
    await page.getByLabel("Turno").selectOption("NOCHE");
    await page.getByLabel("Fecha").fill(proximaClaseEnAula12());
    await page.getByRole("button", { name: "Generar QR" }).click();

    const qr = page.locator('[data-slot="qr-codigo"] path').last();
    await expect(page.getByRole("timer")).toContainText(/Cambia en \d+ s/);
    await expect(page.getByText("Turno Noche")).toBeVisible();
    await expect(page.getByText("Proyecto Final")).toBeVisible();
    await expect(page.getByText(/19:00 – 23:00/)).toBeVisible();
    const primerCodigo = await qr.getAttribute("d");

    await page.getByRole("button", { name: "Pantalla completa" }).click();
    const pantalla = page.getByRole("dialog", { name: /pantalla completa/i });
    await expect(pantalla).toContainText("Aula 12");
    await expect(pantalla).toContainText("Turno Noche");
    await page.keyboard.press("Escape");

    await expect.poll(() => qr.getAttribute("d"), { timeout: 75_000 }).not.toBe(primerCodigo);
    await expect(page.getByRole("timer")).toContainText(/Cambia en (5\d|60) s/);
  });

  test("un aula sin clases en el turno da error y no muestra QR", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/qr");
    await page.getByLabel("Aula").selectOption({ label: "Aula 3" });
    await page.getByLabel("Turno").selectOption("MANANA");
    await page.getByLabel("Fecha").fill(proximaClaseEnAula12());
    await page.getByRole("button", { name: "Generar QR" }).click();

    await expect(page.getByText("El aula no tiene clases en ese turno").first()).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);
  });

  test("una fecha pasada da error y no muestra QR", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/qr");
    await page.getByLabel("Aula").selectOption({ label: "Aula 12" });
    await page.getByLabel("Turno").selectOption("NOCHE");
    await page.getByLabel("Fecha").fill("2020-01-06");
    await page.getByRole("button", { name: "Generar QR" }).click();

    await expect(page.getByText("La fecha ya pasó")).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);
  });

  test("un turno ya terminado hoy da error y no muestra QR", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    await page.getByLabel("Mañana: inicio").fill("00:00");
    await page.getByLabel("Mañana: fin").fill("00:01");
    await page.getByRole("button", { name: "Guardar turnos" }).click();
    await expect(page.getByText("Turnos actualizados")).toBeVisible();

    try {
      await page.goto("/qr");
      await page.getByLabel("Aula").selectOption({ label: "Aula 12" });
      await page.getByLabel("Turno").selectOption("MANANA");
      await page.getByRole("button", { name: "Generar QR" }).click();
      await expect(page.getByText("El turno ya terminó")).toBeVisible();
      await expect(page.getByRole("timer")).toHaveCount(0);
    } finally {
      await page.goto("/configuracion");
      await page.getByLabel("Mañana: inicio").fill("07:00");
      await page.getByLabel("Mañana: fin").fill("13:00");
      await page.getByRole("button", { name: "Guardar turnos" }).click();
      await expect(page.getByText("Turnos actualizados")).toBeVisible();
    }
  });

  test("al vencer el código junto con el turno el QR desaparece con un aviso", async ({ page }) => {
    const ahora = Date.now();
    await page.route("**/api/v1/qr/sesiones", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "sesion-e2e",
          token: "token-e2e",
          aula: { id: "aula-12", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" },
          fecha: fechaArgentina(new Date()),
          turno: "NOCHE",
          turnoInicio: new Date(ahora - 3_600_000).toISOString(),
          turnoFin: new Date(ahora + 3_000).toISOString(),
          emitidoEn: new Date(ahora).toISOString(),
          venceEn: new Date(ahora + 3_000).toISOString(),
        }),
      }),
    );
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/qr");
    await page.getByLabel("Aula").selectOption({ label: "Aula 12" });
    await page.getByLabel("Turno").selectOption("NOCHE");
    await page.getByRole("button", { name: "Generar QR" }).click();

    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByText("El turno terminó")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("timer")).toHaveCount(0);
  });

  test("un cambio de turnos en Configuración se ve en el QR", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    await page.getByLabel("Noche: fin").fill("23:00");
    await page.getByRole("button", { name: "Guardar turnos" }).click();
    await expect(page.getByText("Turnos actualizados")).toBeVisible();

    await page.goto("/qr");
    await expect(page.getByRole("option", { name: "Noche 18:00–23:00" })).toBeAttached();

    await page.goto("/configuracion");
    await page.getByLabel("Noche: fin").fill("23:30");
    await page.getByRole("button", { name: "Guardar turnos" }).click();
    await expect(page.getByText("Turnos actualizados").last()).toBeVisible();
    await page.goto("/qr");
    await expect(page.getByRole("option", { name: "Noche 18:00–23:30" })).toBeAttached();
  });

  test("un docente no ve el ítem y por URL vuelve al inicio", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await expect(page.getByRole("link", { name: "QR de asistencia" })).toHaveCount(0);
    await page.goto("/qr");
    await expect(page).toHaveURL(/\/$/);
  });
});
