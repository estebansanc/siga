import {
  crearAulaConClaseEnCurso,
  eliminarClaseConAula,
  ponerAulaEnMantenimiento,
  registrarDocentePresente,
} from "./support/clase-de-hoy";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

test.describe("Plano de aulas", () => {
  test("el bedel ve el estado de cada aula y su pop-up, y se actualiza sin recargar", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { aulaId, aulaCodigo, edificio, claseId } = await crearAulaConClaseEnCurso();
    try {
      await loginViaUi(page, seededUsers.bedel);
      await page.getByRole("link", { name: "Plano de aulas" }).click();
      await expect(page.getByRole("heading", { name: "Plano de aulas" })).toBeVisible();
      await page.getByRole("button", { name: edificio }).click();
      const celda = page.getByRole("button", { name: new RegExp(aulaCodigo) });
      await expect(celda).toContainText("Pendiente");
      await expectNoHorizontalPageScroll(page);

      await celda.click();
      const dialog = page.getByRole("dialog", { name: aulaCodigo });
      await expect(dialog).toContainText("5K2");
      await expect(dialog).toContainText("Sin asistencia registrada");
      await page.keyboard.press("Escape");

      await registrarDocentePresente(claseId);
      await expect(celda).toContainText("Ocupada", { timeout: 45_000 });
      await celda.click();
      await expect(dialog).toContainText("Docente presente");
      await page.keyboard.press("Escape");

      await ponerAulaEnMantenimiento(aulaId);
      await expect(celda).toContainText("En mantenimiento", { timeout: 45_000 });
      await celda.click();
      await expect(dialog).toContainText("En mantenimiento");
      await expect(dialog).toContainText("5K2");
    } finally {
      await eliminarClaseConAula(claseId, aulaId);
    }
  });

  test("el docente abre el plano por la ruta, en consulta", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/plano-de-aulas");
    await expect(page.getByRole("heading", { name: "Plano de aulas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edificio" })).toHaveCount(0);
  });
});
