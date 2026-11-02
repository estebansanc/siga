import { createHmac } from "node:crypto";

import { expect, readMeViaApi, test } from "./support/fixtures";

// Misma firma que `packages/api/src/services/notificaciones.ts`, con el secreto de la config e2e.
const e2eSecret = "e2e-secret-e2e-secret-e2e-secret-e2e";
const tokenDeBaja = (tipo: "novedades" | "avisos", userId: string) =>
  `${tipo}.${Buffer.from(userId).toString("base64url")}.${createHmac("sha256", e2eSecret)
    .update(`baja-${tipo}:${userId}`)
    .digest("base64url")}`;

const switchNovedades = "Recibir novedades por correo";
const switchAvisos = "Recibir avisos institucionales por correo";

test.describe("Correo de novedades", () => {
  test("el estudiante activa cada opción, persiste al recargar y arrancan desactivadas", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/mi-cuenta/notificaciones");
    await expect(page.getByRole("switch", { name: switchNovedades })).not.toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).not.toBeChecked();

    await page.getByRole("switch", { name: switchNovedades }).click();
    await expect(page.getByText("Vas a recibir novedades por correo")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("switch", { name: switchNovedades })).toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).not.toBeChecked();
  });

  test("la baja funciona sin sesión, desactiva solo novedades y un enlace alterado da error", async ({
    authenticatedPage: page,
    browser,
    baseURL,
    user,
  }) => {
    const { userId } = await readMeViaApi(page.request);
    await page.goto("/mi-cuenta/notificaciones");
    await page.getByRole("switch", { name: switchNovedades }).click();
    await expect(page.getByRole("switch", { name: switchNovedades })).toBeChecked();
    await page.getByRole("switch", { name: switchAvisos }).click();
    await expect(page.getByRole("switch", { name: switchAvisos })).toBeChecked();

    const anonymous = await browser.newContext({ baseURL });
    const baja = await anonymous.newPage();
    const token = tokenDeBaja("novedades", userId);

    await baja.goto(`/baja-correo?token=${token}x`);
    await baja.getByRole("button", { name: "Dejar de recibir" }).click();
    await expect(
      baja.getByText("El enlace para dejar de recibir correos no es válido."),
    ).toBeVisible();

    await baja.goto(`/baja-correo?token=${token}`);
    await expect(baja.getByText("Dejar de recibir correos", { exact: true })).toBeVisible();
    await baja.getByRole("button", { name: "Dejar de recibir" }).click();
    await expect(
      baja.getByText(
        "Listo. Ya no vas a recibir novedades de clase por correo. Podés volver a activarlas desde Mi cuenta → Notificaciones.",
      ),
    ).toBeVisible();

    await baja.getByRole("link", { name: "Ir a Notificaciones" }).click();
    await expect(baja).toHaveURL(/\/login\?next=%2Fmi-cuenta%2Fnotificaciones/);
    await baja.getByLabel("Email").fill(user.email);
    await baja.getByLabel("Contraseña").fill(user.password);
    await baja.getByRole("button", { name: "Ingresar" }).click();
    await expect(baja).toHaveURL(/\/mi-cuenta\/notificaciones/);
    await expect(baja.getByRole("switch", { name: switchNovedades })).not.toBeChecked();
    await expect(baja.getByRole("switch", { name: switchAvisos })).toBeChecked();
    await anonymous.close();

    await page.goto("/mi-cuenta/notificaciones");
    await expect(page.getByRole("switch", { name: switchNovedades })).not.toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).toBeChecked();
  });

  test("la baja de avisos funciona sin sesión y desactiva solo la opción de avisos", async ({
    authenticatedPage: page,
    browser,
    baseURL,
  }) => {
    const { userId } = await readMeViaApi(page.request);
    await page.goto("/mi-cuenta/notificaciones");
    await page.getByRole("switch", { name: switchNovedades }).click();
    await expect(page.getByRole("switch", { name: switchNovedades })).toBeChecked();
    await page.getByRole("switch", { name: switchAvisos }).click();
    await expect(page.getByRole("switch", { name: switchAvisos })).toBeChecked();

    const anonymous = await browser.newContext({ baseURL });
    const baja = await anonymous.newPage();
    await baja.goto(`/baja-correo?token=${tokenDeBaja("avisos", userId)}`);
    await baja.getByRole("button", { name: "Dejar de recibir" }).click();
    await expect(
      baja.getByText("Listo, ya no vas a recibir avisos institucionales por correo."),
    ).toBeVisible();
    await anonymous.close();

    await page.goto("/mi-cuenta/notificaciones");
    await expect(page.getByRole("switch", { name: switchNovedades })).toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).not.toBeChecked();
  });

  test("la baja sin enlace válido abre sin sesión y no ofrece la baja", async ({
    browser,
    baseURL,
  }) => {
    const anonymous = await browser.newContext({ baseURL });
    const baja = await anonymous.newPage();
    await baja.goto("/baja-correo");
    await expect(
      baja.getByText("El enlace para dejar de recibir correos no es válido."),
    ).toBeVisible();
    await expect(baja.getByRole("button", { name: "Dejar de recibir" })).toHaveCount(0);
    await anonymous.close();
  });
});
