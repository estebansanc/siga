import type { Page } from "@playwright/test";

import {
  borrarClaseDeAsistencia,
  claseDeAsistenciaId,
  crearClaseDeAsistenciaHoy,
} from "./support/db";
import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const sede = { latitude: -26.816955500941518, longitude: -65.19835580019078 };
const aula7 = "aula-7";

// Mañana hasta las 13, tarde hasta las 18 y noche después (turnos iniciales).
const turnoActual = () => {
  const hora = new Date(Date.now() - 3 * 60 * 60 * 1000).getUTCHours();
  return hora < 13 ? "MANANA" : hora < 18 ? "TARDE" : "NOCHE";
};
const etiquetaDeTurno = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" } as const;
const minutosArgentinos = () => {
  const ahora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
};

// En el navegador de la suite no hay cámara ni BarcodeDetector: la cámara es un canvas que
// dibuja cuadros y el detector devuelve el código que el test dejó en la página.
const simularCamaraConQr = (token: string) => {
  Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
    configurable: true,
    value: () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const contexto = canvas.getContext("2d");
      let cuadro = 0;
      setInterval(() => {
        contexto?.fillRect(0, 0, 320, 320 - (cuadro++ % 2));
      }, 50);
      return Promise.resolve(canvas.captureStream(20));
    },
  });
  (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = class {
    detect() {
      return Promise.resolve([{ rawValue: token }]);
    }
  };
};

const generarQrEnPantalla = async (page: Page, turno: keyof typeof etiquetaDeTurno) => {
  await page.goto("/qr");
  await page.getByLabel("Aula").selectOption({ label: "Aula 7" });
  await page.getByLabel("Turno").selectOption(turno);
  await page.getByRole("button", { name: "Generar QR" }).click();
};

test.describe("Asistencia docente por QR", () => {
  test.afterEach(() => borrarClaseDeAsistencia());

  test("el docente escanea el QR del aula y el bedel ve la clase con Docente presente", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    test.skip(minutosArgentinos() >= 23 * 60 + 25, "El último turno ya está por terminar");
    const turno = turnoActual();
    const fecha = crearClaseDeAsistenciaHoy();

    const bedelContext = await browser.newContext();
    const bedel = await bedelContext.newPage();
    await loginViaUi(bedel, seededUsers.bedel);
    await generarQrEnPantalla(bedel, turno);
    const clase = bedel.locator(`[data-clase-id="${claseDeAsistenciaId}"]`);
    await expect(clase).toContainText("Sin registro");

    const sesion = await bedel.request.post("/api/v1/qr/sesiones", {
      data: { aulaId: aula7, turno, fecha },
    });
    expect(sesion.ok()).toBeTruthy();
    const { token } = (await sesion.json()) as { token: string };

    const docenteContext = await browser.newContext({
      permissions: ["geolocation", "camera"],
      geolocation: { ...sede, accuracy: 10 },
    });
    await docenteContext.addInitScript(simularCamaraConQr, token);
    const docente = await docenteContext.newPage();
    await loginViaUi(docente, seededUsers.docente);
    await docente.getByRole("link", { name: "Asistencia", exact: true }).click();
    await expect(docente.getByRole("heading", { name: "Registrar asistencia" })).toBeVisible();

    await expect(docente.getByText("Asistencia registrada", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      docente.getByText(new RegExp(`Aula 7 · Turno ${etiquetaDeTurno[turno]} · \\d{2}:\\d{2}`)),
    ).toBeVisible();

    await bedel.goto("/clases");
    const tarjeta = bedel.locator(`[data-clase-id="${claseDeAsistenciaId}"]`);
    await expect(tarjeta).toContainText("Docente presente");

    await generarQrEnPantalla(bedel, turno);
    await expect(clase).toContainText(/QR · \d{2}:\d{2}/);

    await docenteContext.close();
    await bedelContext.close();
  });

  test("un código alterado da error y ofrece volver a escanear", async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      permissions: ["geolocation", "camera"],
      geolocation: { ...sede, accuracy: 10 },
    });
    await context.addInitScript(simularCamaraConQr, "codigo.alterado");
    const docente = await context.newPage();
    await loginViaUi(docente, seededUsers.docente);
    await docente.goto("/asistencia");

    await expect(docente.getByText(/El código QR no es válido o ya venció/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(docente.getByRole("button", { name: "Volver a escanear" })).toBeVisible();
    await context.close();
  });

  test("con la cámara bloqueada explica cómo habilitarla", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: () => Promise.reject(new DOMException("denegado", "NotAllowedError")),
      });
    });
    const docente = await context.newPage();
    await loginViaUi(docente, seededUsers.docente);
    await docente.goto("/asistencia");

    await expect(docente.getByText("La cámara está bloqueada")).toBeVisible({ timeout: 30_000 });
    await expect(docente.getByText(/Cámara > Permitir/)).toBeVisible();
    await context.close();
  });

  test("otros perfiles no ven Asistencia y por URL vuelven al inicio", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await expect(page.getByRole("link", { name: "Asistencia", exact: true })).toHaveCount(0);
    await page.goto("/asistencia");
    await expect(page).toHaveURL(/\/estado-institucional$/);
  });
});

test.describe("Presencia del docente en Configuración", () => {
  test("el Administrador edita la red institucional y un radio inválido no se guarda", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    const radio = page.getByLabel("Radio (metros)");
    await expect(radio).toHaveValue("200");
    await expect(page.getByLabel("Red institucional")).toHaveValue("");

    await radio.fill("0");
    await page.getByRole("button", { name: "Guardar presencia" }).click();
    await expect(page.getByText("El radio debe estar entre 1 y 5000 metros.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Radio (metros)")).toHaveValue("200");

    await page.getByLabel("Red institucional").fill("200.0.0.0/24");
    await page.getByRole("button", { name: "Guardar presencia" }).click();
    await expect(page.getByText("Presencia actualizada")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Red institucional")).toHaveValue("200.0.0.0/24");

    await page.getByLabel("Red institucional").fill("");
    await page.getByRole("button", { name: "Guardar presencia" }).click();
    await expect(page.getByText("Presencia actualizada")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Red institucional")).toHaveValue("");
  });
});
