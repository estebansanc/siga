import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

test.describe("Configuración", () => {
  test("muestra la versión del sistema y sus novedades, aunque no haya cambios", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    await expect(page.getByText(/^Versión .*\d+\.\d+$/)).toBeVisible();
    await page.getByRole("button", { name: "Novedades" }).click();
    const dialog = page.getByRole("dialog", { name: "Novedades" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(
      dialog.getByRole("listitem").or(dialog.getByText("Sin cambios registrados.")).first(),
    ).toBeVisible();
  });

  test("no muestra Miembros y conserva las demás tarjetas", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    await expect(page.getByText("Presencia del docente", { exact: true })).toBeVisible();
    await expect(page.getByText("Turnos", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Miembros", { exact: true })).toHaveCount(0);
  });

  test("un estudiante no ve Configuración y por URL vuelve a Mis clases", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole("link", { name: "Configuración" })).toHaveCount(0);
    await page.goto("/configuracion");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
  });
});
