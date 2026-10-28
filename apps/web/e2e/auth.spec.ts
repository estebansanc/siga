import { expect, newUser, registerViaUi, test, verifyEmailViaLink } from "./support/fixtures";

test.describe("Autenticación", () => {
  test("el registro pide verificar el correo y con el enlace entra como estudiante", async ({
    page,
  }) => {
    const user = newUser();
    await registerViaUi(page, user);

    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Verificá tu correo para ingresar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar enlace" })).toBeVisible();

    await verifyEmailViaLink(page, user);
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page.getByRole("link", { name: "Preferencias" })).toBeVisible();
  });

  test("login con credenciales incorrectas avisa y no entra", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nadie@example.com");
    await page.getByLabel("Contraseña").fill("incorrecta");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("rutas protegidas redirigen a login y vuelven al destino", async ({ page, user }) => {
    await page.goto("/mi-perfil");
    await expect(page).toHaveURL(/\/login\?next=%2Fmi-perfil/);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/mi-perfil/);
  });

  test("cerrar sesión vuelve al login", async ({ authenticatedPage: page, user }) => {
    await page.getByRole("button", { name: new RegExp(user.name) }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
