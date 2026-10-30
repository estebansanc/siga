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
      await page.getByRole("link", { name: "Aulas", exact: true }).click();
      await page.getByRole("button", { name: "Plano", exact: true }).click();
      await expect(page).toHaveURL(/\/aulas\?vista=plano/);
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
    const { aulaId, aulaCodigo, edificio, claseId } = await crearAulaConClaseEnCurso();
    try {
      await loginViaUi(page, seededUsers.docente);
      await page.goto("/aulas?vista=plano");
      await expect(page.getByRole("heading", { name: "Aulas" })).toBeVisible();
      await page.getByRole("button", { name: edificio }).click();
      await page.getByRole("button", { name: new RegExp(aulaCodigo) }).click();
      const dialog = page.getByRole("dialog", { name: aulaCodigo });
      await expect(dialog).toContainText("5K2");
      await expect(dialog.getByRole("button", { name: /Registrar|Publicar|Cambiar/ })).toHaveCount(
        0,
      );
    } finally {
      await eliminarClaseConAula(claseId, aulaId);
    }
  });

  test("el estudiante abre el plano por la ruta, en consulta y sin conmutador", async ({
    page,
  }) => {
    const { aulaId, aulaCodigo, edificio, claseId } = await crearAulaConClaseEnCurso();
    try {
      await loginViaUi(page, seededUsers.estudiante);
      await page.goto("/aulas?vista=plano");
      await expect(page.getByRole("heading", { name: "Aulas" })).toBeVisible();
      await expect(page.getByRole("group", { name: "Vista" })).toHaveCount(0);
      await page.getByRole("button", { name: edificio }).click();
      await page.getByRole("button", { name: new RegExp(aulaCodigo) }).click();
      const dialog = page.getByRole("dialog", { name: aulaCodigo });
      await expect(dialog).toContainText("5K2");
      await expect(dialog.getByRole("button", { name: /Asignar|Mover|Reemplazar/ })).toHaveCount(0);
    } finally {
      await eliminarClaseConAula(claseId, aulaId);
    }
  });

  test("en 375 px no hay scroll horizontal con selectores y celdas visibles", async ({ page }) => {
    const { aulaId, aulaCodigo, edificio, claseId } = await crearAulaConClaseEnCurso();
    try {
      await page.setViewportSize({ width: 375, height: 800 });
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/aulas?vista=plano");
      await page.getByRole("button", { name: edificio }).click();
      await expect(page.getByRole("button", { name: new RegExp(aulaCodigo) })).toBeVisible();
      await expect(page.getByRole("group", { name: "Piso" })).toBeVisible();
      await expectNoHorizontalPageScroll(page);
    } finally {
      await eliminarClaseConAula(claseId, aulaId);
    }
  });
});
