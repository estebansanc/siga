import { enlaceDelUltimoCorreo } from "./support/db";
import { expect, test } from "./support/fixtures";

const mensajeGenerico = "Si el correo está registrado, recibirás un enlace.";

test.describe("Recuperar la contraseña", () => {
  test("pide el enlace, define la contraseña nueva y entra con ella", async ({ page, user }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL(/\/recuperar-contrasena/);

    await page.getByLabel("Email").fill("noexiste@example.com");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText(mensajeGenerico)).toBeVisible();

    await page.getByLabel("Email").fill(user.email);
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText(mensajeGenerico)).toBeVisible();

    const enlace = enlaceDelUltimoCorreo(user.email);
    await page.goto(enlace);
    await expect(
      page.getByText("Mínimo 8 caracteres, con al menos una letra y un número."),
    ).toBeVisible();

    await page.getByLabel("Nueva contraseña").fill("abcdefgh");
    await page.getByLabel("Confirmar contraseña").fill("abcdefgh");
    await page.getByRole("button", { name: "Definir contraseña" }).click();
    await expect(page.getByText("La contraseña debe incluir al menos un número.")).toBeVisible();

    await page.getByLabel("Nueva contraseña").fill("nueva1234");
    await page.getByLabel("Confirmar contraseña").fill("nueva12345");
    await page.getByRole("button", { name: "Definir contraseña" }).click();
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();

    await page.getByLabel("Confirmar contraseña").fill("nueva1234");
    await page.getByRole("button", { name: "Definir contraseña" }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Tu contraseña se actualizó")).toBeVisible();

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Email o contraseña incorrectos")).toBeVisible();

    await page.getByLabel("Contraseña").fill("nueva1234");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).not.toHaveURL(/\/login/);

    await page.context().clearCookies();
    await page.goto(enlace);
    await expect(page.getByText("El enlace venció o ya fue usado.")).toBeVisible();
    await page.getByRole("button", { name: "Pedir otro enlace" }).click();
    await expect(page).toHaveURL(/\/recuperar-contrasena/);
  });
});
