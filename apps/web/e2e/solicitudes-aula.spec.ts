import type { Page } from "@playwright/test";

import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const item = (page: Page, ...textos: (string | RegExp)[]) =>
  textos.reduce(
    (items, texto) => items.filter({ hasText: texto }),
    page.locator('[data-slot="item"]'),
  );

const cantidadCambiosDeAula = async (page: Page) => {
  const response = await page.request.get("/api/v1/novedades");
  const novedades = (await response.json()) as { tipo: string }[];
  return novedades.filter(({ tipo }) => tipo === "CAMBIO_AULA").length;
};

// Parte de los datos que deja el seed: dos Pendientes (5K2 Proyecto Final y 4K2 Sistemas de
// Gestión), una Asignada (5K2 Administración Gerencial) y clases sin aula (5K2 Simulación e
// Inteligencia Artificial).
test.describe("Solicitudes de aula", () => {
  test.describe.configure({ mode: "serial" });

  test("el bedel aprueba, rechaza, reasigna y asigna aula a una clase sin aula", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/solicitudes");
    await expect(page.getByRole("heading", { name: "Solicitudes de aula" })).toBeVisible();

    const proyectoFinal = item(page, /Proyecto Final · 5K2/, "Aula pedida: Laboratorio 3");
    const sistemasDeGestion = item(page, /Sistemas de Gestión · 4K2/, "Aula pedida: Aula 12");
    await expect(proyectoFinal).toHaveCount(1);
    await expect(sistemasDeGestion).toContainText("Marcos Álvarez");

    await proyectoFinal.getByRole("button", { name: "Aprobar" }).click();
    const aprobacion = page.getByRole("dialog", { name: "Aprobar solicitud" });
    await expect(aprobacion.getByLabel("Aula")).toHaveValue("lab-3");
    await aprobacion.getByLabel("Aula").selectOption("aula-3");
    await aprobacion.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByText("Solicitud aprobada")).toBeVisible();
    await expect(proyectoFinal).toHaveCount(0);
    await page.getByRole("tab", { name: "Aprobadas" }).click();
    await expect(item(page, /Proyecto Final · 5K2/, "Aprobada", "Aula 3 (")).toHaveCount(1);

    await page.goto("/novedades");
    await expect(page.getByText("Cambio de aula").first()).toBeVisible();

    await page.goto("/solicitudes");
    await sistemasDeGestion.getByRole("button", { name: "Rechazar" }).click();
    const rechazo = page.getByRole("dialog", { name: "Rechazar solicitud" });
    await rechazo.getByRole("button", { name: "Rechazar" }).click();
    await expect(rechazo.getByText("Ingresá el motivo del rechazo.")).toBeVisible();
    await rechazo.getByLabel("Motivo").fill("Hay obras en el aula");
    await rechazo.getByRole("button", { name: "Rechazar" }).click();
    await expect(page.getByText("Solicitud rechazada")).toBeVisible();
    await page.getByRole("tab", { name: "Rechazadas" }).click();
    await expect(
      item(page, /Sistemas de Gestión · 4K2/, "Motivo del rechazo: Hay obras en el aula"),
    ).toHaveCount(1);

    await page.getByRole("tab", { name: "Asignadas" }).click();
    const asignada = item(page, /Administración Gerencial · 5K2/);
    await expect(asignada).toContainText("Asignada (inmediata)");
    await expect(asignada.getByRole("button", { name: "Rechazar" })).toHaveCount(0);
    await asignada.getByRole("button", { name: "Reasignar" }).click();
    const reasignacion = page.getByRole("dialog", { name: "Reasignar aula" });
    await expect(reasignacion.getByRole("option", { name: /Laboratorio 3/ })).toHaveCount(0);
    await reasignacion.getByLabel("Aula").selectOption({ index: 1 });
    await reasignacion.getByRole("button", { name: "Reasignar" }).click();
    await expect(page.getByText("Aula reasignada")).toBeVisible();
    await expect(item(page, /Administración Gerencial · 5K2/)).toContainText(
      "Asignada (inmediata)",
    );
    await expect(item(page, /Administración Gerencial · 5K2/)).not.toContainText("Laboratorio 3");
  });

  test("un aula ocupada entre tanto no se asigna y una libre saca la clase de la lista", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/solicitudes");
    await page.getByRole("tab", { name: "Clases sin aula" }).click();
    const simulacion = item(page, /Simulación · 5K2/);
    await simulacion.getByRole("button", { name: "Asignar aula" }).click();
    const dialog = page.getByRole("dialog", { name: "Asignar aula" });
    await dialog.getByLabel("Aula").selectOption({ value: "aula-12" });

    const solicitudes = (await (
      await page.request.get("/api/v1/solicitudes-aula?estado=RECHAZADA")
    ).json()) as { clase: { id: string; materia: string } }[];
    const gestion = solicitudes.find(({ clase }) => clase.materia === "Sistemas de Gestión");
    expect(gestion).toBeDefined();
    const publicada = await page.request.post("/api/v1/novedades", {
      data: { claseIds: [gestion?.clase.id], tipo: "CAMBIO_AULA", aulaNuevaId: "aula-12" },
    });
    expect(publicada.ok()).toBeTruthy();

    await dialog.getByRole("button", { name: "Asignar" }).click();
    await expect(dialog.getByText("El aula ya está asignada en esa franja")).toBeVisible();
    await expect(simulacion).toBeVisible();

    const cambiosAntes = await cantidadCambiosDeAula(page);
    await dialog.getByLabel("Aula").selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Asignar" }).click();
    await expect(page.getByText("Aula asignada")).toBeVisible();
    await expect(simulacion).toHaveCount(0);
    expect(await cantidadCambiosDeAula(page)).toBe(cambiosAntes);
  });

  test("otros perfiles no ven Solicitudes y vuelven a su inicio", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await expect(page.getByRole("link", { name: "Solicitudes" })).toHaveCount(0);
    await page.goto("/solicitudes");
    await expect(page).not.toHaveURL(/\/solicitudes/);
  });
});
