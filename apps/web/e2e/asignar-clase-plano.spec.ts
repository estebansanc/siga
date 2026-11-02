import type { Page } from "@playwright/test";

import { crearEscenarioDeAsignacion, eliminarEscenarioDeAsignacion } from "./support/clase-de-hoy";
import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

type Escenario = Awaited<ReturnType<typeof crearEscenarioDeAsignacion>>;

let escenario: Escenario;
let creado = false;

test.beforeEach(async () => {
  escenario = await crearEscenarioDeAsignacion();
  creado = true;
});

test.afterEach(async () => {
  if (creado) await eliminarEscenarioDeAsignacion(escenario);
  creado = false;
});

const abrirPlano = async (page: Page, usuario: typeof seededUsers.bedel) => {
  await loginViaUi(page, usuario);
  await page.goto("/aulas?vista=plano");
  await page.getByRole("button", { name: escenario.edificio }).click();
};

const celda = (page: Page, codigo: string) =>
  page.getByRole("button", { name: new RegExp(codigo) });

test.describe("Asignar, mover y reemplazar desde el plano", () => {
  test("el bedel asigna una clase a un aula libre y la mueve a otra aula", async ({ page }) => {
    test.setTimeout(120_000);
    await abrirPlano(page, seededUsers.bedel);
    await expect(celda(page, escenario.libre.codigo)).toContainText("Libre");

    await celda(page, escenario.libre.codigo).click();
    await page.getByRole("button", { name: "Asignar clase" }).click();
    const asignar = page.getByRole("dialog", { name: "Asignar clase" });
    await asignar.getByLabel("Clase").selectOption(escenario.claseSinAulaId);
    await asignar.getByRole("button", { name: "Asignar", exact: true }).click();
    await expect(asignar).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(celda(page, escenario.libre.codigo)).toContainText("Pendiente");

    await celda(page, escenario.conClase.codigo).click();
    await page.getByRole("button", { name: "Mover a otra aula" }).click();
    const mover = page.getByRole("dialog", { name: "Mover a otra aula" });
    await expect(mover.locator(`optgroup[label="${escenario.edificio}, 1.º piso"]`)).toHaveCount(1);
    await mover.getByLabel("Aula de destino").selectOption(escenario.destino.id);
    await mover.getByRole("button", { name: "Mover", exact: true }).click();
    await expect(mover).toBeHidden();
    await page.keyboard.press("Escape");

    await expect(celda(page, escenario.conClase.codigo)).toContainText("Libre");
    await expect(celda(page, escenario.destino.codigo)).toContainText("Pendiente");
  });

  test("la autoridad reemplaza la clase de un aula", async ({ page }) => {
    test.setTimeout(120_000);
    await loginViaUi(page, seededUsers.autoridad);
    await page.getByRole("link", { name: "Aulas", exact: true }).click();
    await expect(page.getByRole("group", { name: "Vista" })).toHaveCount(0);
    await page.getByRole("button", { name: escenario.edificio }).click();
    await celda(page, escenario.conClase.codigo).click();
    await page.getByRole("button", { name: "Reemplazar clase" }).click();
    const reemplazar = page.getByRole("dialog", { name: "Reemplazar clase" });
    await reemplazar.getByLabel("Clase que entra").selectOption(escenario.claseSinAulaId);
    await reemplazar.getByLabel("Aula para la clase actual").selectOption(escenario.destino.id);
    await reemplazar.getByRole("button", { name: "Reemplazar", exact: true }).click();
    await expect(reemplazar).toBeHidden();
    await page.keyboard.press("Escape");

    await expect(celda(page, escenario.destino.codigo)).toContainText("Pendiente");
  });

  test("el docente y el estudiante ven el panel sin acciones", async ({ page }) => {
    for (const usuario of [seededUsers.docente, seededUsers.estudiante]) {
      await abrirPlano(page, usuario);
      for (const codigo of [escenario.libre.codigo, escenario.conClase.codigo]) {
        await celda(page, codigo).click();
        const dialog = page.getByRole("dialog", { name: codigo });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("button", { name: /Asignar clase|Mover a otra aula|Reemplazar clase/ }),
        ).toHaveCount(0);
        await page.keyboard.press("Escape");
      }
      await page.context().clearCookies();
    }
  });
});
