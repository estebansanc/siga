import type { Browser, Page } from "@playwright/test";

import {
  borrarClaseDeAsistencia,
  claseDeAsistenciaId,
  crearClaseDeAsistenciaHoy,
} from "./support/db";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

const minutosArgentinos = () => {
  const ahora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
};

const comoEstudiante = async (browser: Browser, baseURL: string | undefined) => {
  const contexto = await browser.newContext({ baseURL });
  const pagina = await contexto.newPage();
  await loginViaUi(pagina, seededUsers.estudiante);
  return { contexto, pagina };
};

// El formulario indica que el estado elegido es el vigente recién cuando cargó el estado actual:
// elegir antes de eso se pierde al hidratar.
const cambiarEstado = async (page: Page, estado: string, motivo?: string) => {
  await expect(page.getByText("Ese ya es el estado actual.")).toBeVisible();
  await page.getByLabel("Nuevo estado").selectOption(estado);
  if (motivo) await page.getByLabel(/Motivo/).fill(motivo);
  await page.getByRole("button", { name: "Cambiar estado" }).click();
};

test.describe("Paro levantado el mismo día", () => {
  test.afterEach(() => borrarClaseDeAsistencia());

  test("al reabrir, el bedel reanuda las clases que suspendió el cierre", async ({
    page,
    browser,
    baseURL,
  }) => {
    test.skip(minutosArgentinos() >= 23 * 60 + 50, "La clase del test ya está por terminar");
    crearClaseDeAsistenciaHoy();
    const { contexto, pagina: estudiante } = await comoEstudiante(browser, baseURL);
    const estadoDeLaClase = estudiante.locator(`[data-clase-id="${claseDeAsistenciaId}"]`);
    await estudiante.goto("/");
    await expect(estadoDeLaClase.locator("[data-estado]")).toHaveAttribute(
      "data-estado",
      "PROGRAMADA",
    );

    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/estado-institucional");
    await cambiarEstado(page, "CERRADA", "Paro docente");
    await page.getByRole("button", { name: "Cerrar la institución" }).click();
    await expect(page.getByText(/clases pasaron a Suspendida/)).toBeVisible();
    await page
      .getByRole("alertdialog", { name: "¿Generar un aviso institucional?" })
      .getByRole("button", { name: "Ahora no" })
      .click();
    await estudiante.reload();
    await expect(estadoDeLaClase.locator("[data-estado]")).toHaveAttribute(
      "data-estado",
      "SUSPENDIDA",
    );

    await page.getByLabel("Nuevo estado").selectOption("ABIERTA");
    const reanudar = page.getByRole("checkbox", {
      name: "Reanudar las clases suspendidas por el cierre",
    });
    await expect(reanudar).toBeChecked();
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByText(/Estado registrado\. Se reanudaron \d+ clases/)).toBeVisible();
    await expect(reanudar).toHaveCount(0);

    await estudiante.reload();
    await expect(estadoDeLaClase.locator("[data-estado]")).toHaveAttribute(
      "data-estado",
      "PROGRAMADA",
    );
    await contexto.close();
  });

  test("Bedel finaliza un aviso urgente y deja de verse como vigente", async ({
    page,
    browser,
    baseURL,
  }) => {
    const titulo = `Paro ${Date.now().toString(36)}`;
    await loginViaUi(page, seededUsers.bedel);
    const publicado = await page.request.post("/api/v1/avisos", {
      data: {
        titulo,
        cuerpo: "No hay clases",
        prioridad: "URGENTE",
        destinatarios: { todos: true, perfiles: [], carreraIds: [], anios: [], comisionIds: [] },
        hasta: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        enviarPorCorreo: false,
      },
    });
    expect(publicado.ok()).toBeTruthy();

    const { contexto, pagina: estudiante } = await comoEstudiante(browser, baseURL);
    const avisoDelEstudiante = estudiante.locator("[data-slot=item]", { hasText: titulo });
    const indicadorUrgente = estudiante.getByRole("link", {
      name: new RegExp(`Aviso urgente: ${titulo}|\\d+ avisos urgentes`),
    });
    await estudiante.goto("/avisos");
    await expect(avisoDelEstudiante).toBeVisible();
    await expect(indicadorUrgente).toBeVisible();

    await page.goto("/avisos");
    await page.getByRole("tab", { name: "Publicados" }).click();
    const aviso = page.locator("[data-slot=item]", { hasText: titulo });
    await aviso.getByRole("button", { name: "Finalizar" }).click();
    const confirmacion = page.getByRole("alertdialog", { name: "¿Finalizar el aviso?" });
    await confirmacion.getByRole("button", { name: "Finalizar aviso" }).click();
    await expect(page.getByText("Aviso finalizado")).toBeVisible();
    await expect(aviso.getByText(/Finalizado por Rosa Benítez el/)).toBeVisible();
    await expect(aviso.getByRole("button", { name: "Finalizar" })).toHaveCount(0);

    await estudiante.reload();
    await expect(estudiante.getByRole("tab", { name: "Vigentes" })).toBeVisible();
    await expect(avisoDelEstudiante).toHaveCount(0);
    await expect(indicadorUrgente).toHaveCount(0);
    await estudiante.getByRole("tab", { name: "Historial" }).click();
    await expect(avisoDelEstudiante.getByText(/Finalizado por Rosa Benítez/)).toBeVisible();
    await contexto.close();

    const docente = await browser.newContext({ baseURL });
    const paginaDocente = await docente.newPage();
    await loginViaUi(paginaDocente, seededUsers.docente);
    const intento = await paginaDocente.request.post(
      `/api/v1/avisos/${(await publicado.json()).id}/finalizar`,
    );
    expect(intento.status()).toBe(403);
    await docente.close();
  });

  test("en 375 px la confirmación de finalizar y el formulario de reapertura no scrollean a lo ancho", async ({
    page,
  }) => {
    const titulo = `Móvil ${Date.now().toString(36)}`;
    await page.setViewportSize({ width: 375, height: 800 });
    await loginViaUi(page, seededUsers.bedel);
    const publicado = await page.request.post("/api/v1/avisos", {
      data: {
        titulo,
        cuerpo: "No hay clases",
        prioridad: "URGENTE",
        destinatarios: { todos: true, perfiles: [], carreraIds: [], anios: [], comisionIds: [] },
        hasta: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        enviarPorCorreo: false,
      },
    });
    expect(publicado.ok()).toBeTruthy();

    await page.goto("/avisos");
    await page.getByRole("tab", { name: "Publicados" }).click();
    await page
      .locator("[data-slot=item]", { hasText: titulo })
      .getByRole("button", { name: "Finalizar" })
      .click();
    const confirmacion = page.getByRole("alertdialog", { name: "¿Finalizar el aviso?" });
    await expect(confirmacion).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await confirmacion.getByRole("button", { name: "Finalizar aviso" }).click();
    await expect(page.getByText("Aviso finalizado")).toBeVisible();

    await page.goto("/estado-institucional");
    await cambiarEstado(page, "CERRADA", "Paro docente");
    await page.getByRole("button", { name: "Cerrar la institución" }).click();
    await page
      .getByRole("alertdialog", { name: "¿Generar un aviso institucional?" })
      .getByRole("button", { name: "Ahora no" })
      .click();
    await page.getByLabel("Nuevo estado").selectOption("ABIERTA");
    await expect(
      page.getByRole("checkbox", { name: "Reanudar las clases suspendidas por el cierre" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Las que todavía no terminaron vuelven al estado que tenían antes del cierre.",
      ),
    ).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await expect(page.getByText(/Estado registrado/)).toBeVisible();
  });
});
