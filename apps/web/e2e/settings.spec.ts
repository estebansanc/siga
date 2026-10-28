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

  test("lista al bedel como Administrador de la institución sin botón de invitar", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    const membersCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Miembros", { exact: true }) });
    const admin = membersCard
      .locator('[data-slot="item"]')
      .filter({ hasText: seededUsers.bedel.name });
    await expect(admin).toContainText("Administrador");
    await expect(admin.getByRole("button", { name: /Acciones de/ })).toHaveCount(0);
    await expect(membersCard.getByRole("button", { name: "Invitar" })).toHaveCount(0);
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
