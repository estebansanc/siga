import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

test.describe("Configuración", () => {
  test("muestra la versión del sistema y Qué hay de nuevo, aunque no haya cambios", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    await expect(page.getByText(/^Versión .*\d+\.\d+$/)).toBeVisible();
    await page.getByRole("button", { name: "Qué hay de nuevo" }).click();
    const dialog = page.getByRole("dialog", { name: "Qué hay de nuevo" });
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
    await expect(
      page.getByText("El nombre que ven todos los usuarios en la barra lateral."),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre de la institución")).toBeVisible();
    await expect(page.getByText(/organizaci|miembro|invitaci/i)).toHaveCount(0);
  });

  test("renombrar la institución actualiza la barra lateral sin recargar y se restaura", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    const nombre = page.getByLabel("Nombre de la institución");
    const original = await nombre.inputValue();
    const sidebar = page.locator("[data-sidebar='sidebar']").first();
    try {
      await nombre.fill(`${original}.`);
      await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
      await expect(page.getByText("Institución actualizada")).toBeVisible();
      await expect(sidebar.getByText(`${original}.`, { exact: true })).toBeVisible();
    } finally {
      await nombre.fill(original);
      await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
      await expect(sidebar.getByText(original, { exact: true })).toBeVisible();
    }
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
