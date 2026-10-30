import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

test.describe("Mi cuenta", () => {
  test("el estudiante ve tres pestañas con dirección propia y sin Preferencias en el menú", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByRole("link", { name: "Preferencias" })).toHaveCount(0);
    await page.getByTestId("user-menu-trigger").click();
    await page.getByRole("menuitem", { name: "Mi cuenta" }).click();
    await expect(page).toHaveURL(/\/mi-cuenta$/);
    await expect(page.getByRole("tab")).toHaveText(["Perfil", "Comisiones", "Notificaciones"]);

    await page.getByRole("tab", { name: "Comisiones" }).click();
    await expect(page).toHaveURL(/\/mi-cuenta\/comisiones$/);
    await page.reload();
    await expect(page.getByRole("tab", { name: "Comisiones", selected: true })).toBeVisible();
    await expect(page.getByText("Comisiones que seguís")).toBeVisible();
  });

  test("las rutas viejas redirigen a la pestaña equivalente", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/preferencias");
    await expect(page).toHaveURL(/\/mi-cuenta\/comisiones$/);
    await page.goto("/mi-perfil");
    await expect(page).toHaveURL(/\/mi-cuenta$/);
  });

  test("guardar comisiones no cambia las opciones de correo y al revés", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/mi-cuenta/notificaciones");
    await page.getByRole("switch", { name: "Recibir novedades por correo" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Notificaciones guardadas")).toBeVisible();

    await page.goto("/mi-cuenta/comisiones");
    await page
      .getByLabel("Carrera")
      .selectOption({ label: "Ingeniería en Sistemas de Información" });
    await page.getByLabel("Año").selectOption("5");
    await page.getByLabel("Materia").selectOption({ label: "Proyecto Final" });
    await page.getByRole("button", { name: "Agregar 5K2 de Proyecto Final" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Comisiones guardadas")).toBeVisible();

    await page.goto("/mi-cuenta/notificaciones");
    await expect(page.getByRole("switch", { name: "Recibir novedades por correo" })).toBeChecked();
    await page.getByRole("switch", { name: "Recibir novedades por correo" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Notificaciones guardadas")).toBeVisible();

    await page.goto("/mi-cuenta/comisiones");
    await expect(page.getByText("Proyecto Final").first()).toBeVisible();
  });

  test("el docente ve Perfil y Notificaciones informativa, y no entra a Comisiones", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/mi-cuenta");
    await expect(page.getByRole("tab")).toHaveText(["Perfil", "Notificaciones"]);
    await page.getByRole("tab", { name: "Notificaciones" }).click();
    await expect(page.getByText(/Recibís siempre por correo/)).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);

    await page.goto("/mi-cuenta/comisiones");
    await expect(page).toHaveURL(/\/mi-cuenta$/);
  });
});
