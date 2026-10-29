import { expect, test } from "./support/fixtures";

test.describe("Mi perfil", () => {
  test("cambia el nombre con validación, persiste al recargar y se refleja en la barra lateral", async ({
    authenticatedPage: page,
    user,
  }) => {
    await page.getByTestId("user-menu-trigger").click();
    await page.getByRole("menuitem", { name: "Mi perfil" }).click();
    await expect(page).toHaveURL(/\/mi-perfil/);
    const nameInput = page.getByLabel("Apellido y nombre");
    await expect(nameInput).toHaveValue(user.name);
    await expect(page.getByLabel("Correo")).toHaveValue(user.email);
    await expect(page.getByLabel("Correo")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await nameInput.fill("   ");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Ingresá apellido y nombre")).toBeVisible();

    await nameInput.fill("  Nombre Nuevo QA  ");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Perfil actualizado")).toBeVisible();
    await expect(page.getByTestId("user-menu-trigger")).toContainText("Nombre Nuevo QA");

    await page.getByLabel("DNI").fill("123456");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("El DNI debe tener 7 u 8 dígitos")).toBeVisible();

    const dni = String(10_000_000 + Math.floor(Math.random() * 89_999_999));
    await page.getByLabel("DNI").fill(dni);
    await page.getByLabel("Legajo").fill("L-QA");
    const guardado = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/me") && response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Guardar" }).click();
    expect((await guardado).ok()).toBe(true);

    await page.reload();
    await expect(page.getByLabel("DNI")).toHaveValue(dni);
    await expect(page.getByLabel("Legajo")).toHaveValue("L-QA");
    await expect(page.getByLabel("Apellido y nombre")).toHaveValue("Nombre Nuevo QA");
    await expect(
      page.getByText("Para cambiar el correo o el perfil, pedíselo a Bedelía."),
    ).toBeVisible();
    await expect(page.getByTestId("user-menu-trigger")).toContainText("Nombre Nuevo QA");
  });
});
