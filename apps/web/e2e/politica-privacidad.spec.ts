import type { APIRequestContext } from "@playwright/test";

import { aceptarPolitica, publicarPolitica, retirarPolitica, verificarCorreo } from "./support/db";
import { expect, loginViaUi, logoutViaUi, newUser, seededUsers, test } from "./support/fixtures";

const avisoDeEjemplo = "Texto de ejemplo: esta no es la política definitiva";

const cuentaSinAceptar = async (request: APIRequestContext) => {
  const user = newUser();
  const response = await request.post("/api/auth/sign-up/email", { data: user });
  expect(response.ok()).toBeTruthy();
  verificarCorreo(user.email);
  return user;
};

test.describe("Política de privacidad", () => {
  test("una cuenta nueva ve la política sin menú, vuelve a la ruta pedida al aceptar y no se la piden de nuevo", async ({
    page,
    request,
  }) => {
    const user = await cuentaSinAceptar(request);
    await loginViaUi(page, user);

    await expect(page).toHaveURL(/\/politica-de-privacidad/);
    await expect(page.getByRole("heading", { name: "Política de privacidad" })).toBeVisible();
    await expect(page.getByText("Versión 1")).toBeVisible();
    await expect(page.getByText(avisoDeEjemplo)).toBeVisible();
    await expect(page.getByTestId("user-menu-trigger")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Preferencias" })).toHaveCount(0);

    await page.goto("/preferencias");
    await expect(page).toHaveURL(/\/politica-de-privacidad\?next=%2Fpreferencias/);

    await page.getByRole("button", { name: "Aceptar y continuar" }).click();
    await expect(page).toHaveURL(/\/preferencias$/);
    await expect(page.getByTestId("user-menu-trigger")).toBeVisible();

    await logoutViaUi(page);
    await loginViaUi(page, user);
    await expect(page).toHaveURL(/\/$/);
  });

  test("cerrar sesión desde la política no registra la aceptación", async ({ page, request }) => {
    const user = await cuentaSinAceptar(request);
    await loginViaUi(page, user);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);

    await loginViaUi(page, user);
    await expect(page).toHaveURL(/\/politica-de-privacidad/);
  });

  test("aceptada, se relee desde el menú de usuario con la fecha de aceptación", async ({
    page,
    request,
  }) => {
    const user = await cuentaSinAceptar(request);
    aceptarPolitica(user.email);
    await loginViaUi(page, user);

    await page.getByTestId("user-menu-trigger").click();
    await page.getByRole("menuitem", { name: "Política de privacidad" }).click();
    await expect(page).toHaveURL(/\/politica-de-privacidad$/);
    await expect(page.getByText(/Aceptaste esta versión el \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
    await expect(page.getByText("Versión 1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceptar y continuar" })).toHaveCount(0);
    await expect(page.getByTestId("user-menu-trigger")).toBeVisible();
  });

  test("con la versión anterior abierta, una versión nueva avisa y no registra la aceptación", async ({
    page,
    request,
  }) => {
    const user = await cuentaSinAceptar(request);
    await loginViaUi(page, user);
    await expect(page.getByText("Versión 1")).toBeVisible();

    publicarPolitica(2, "Texto de la versión dos.");
    try {
      await page.getByRole("button", { name: "Aceptar y continuar" }).click();
      await expect(
        page.getByText(
          "Se publicó una nueva versión de la política de privacidad. Leela y aceptala para continuar.",
        ),
      ).toBeVisible();
      await expect(page.getByText("Versión 2")).toBeVisible();
      await expect(page.getByText("Texto de la versión dos.")).toBeVisible();
      await expect(page).toHaveURL(/\/politica-de-privacidad/);

      await page.getByRole("button", { name: "Aceptar y continuar" }).click();
      await expect(page).not.toHaveURL(/\/politica-de-privacidad/);
    } finally {
      retirarPolitica(2);
    }
  });

  test("quien aceptó la versión 1 debe aceptar la 2 cuando se publica", async ({ page }) => {
    publicarPolitica(2, "Texto de la versión dos.");
    try {
      await loginViaUi(page, seededUsers.estudiante);
      await expect(page).toHaveURL(/\/politica-de-privacidad/);
      await expect(page.getByText("Versión 2")).toBeVisible();
    } finally {
      retirarPolitica(2);
    }
  });
});
