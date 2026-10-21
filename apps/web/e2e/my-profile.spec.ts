import { expect, test } from "./support/fixtures";

test.describe("Mi perfil", () => {
  test("cambia el nombre con validación, persiste al recargar y se refleja en la barra lateral", async ({
    authenticatedPage: page,
    user,
  }) => {
    await page.getByTestId("user-menu-trigger").click();
    await page.getByRole("menuitem", { name: "Mi perfil" }).click();
    await expect(page).toHaveURL(/\/mi-perfil/);
    const nameInput = page.getByLabel("Nombre", { exact: true });
    await expect(nameInput).toHaveValue(user.name);
    await expect(page.getByLabel("Email")).toHaveValue(user.email);
    await expect(page.getByLabel("Email")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await nameInput.fill("   ");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Ingresá tu nombre")).toBeVisible();

    await nameInput.fill("  Nombre Nuevo QA  ");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Perfil actualizado")).toBeVisible();
    await expect(page.getByTestId("user-menu-trigger")).toContainText("Nombre Nuevo QA");

    await page.reload();
    await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Nombre Nuevo QA");
    await expect(page.getByTestId("user-menu-trigger")).toContainText("Nombre Nuevo QA");
  });
});
