import { createHmac } from "node:crypto";

import { expect, readMeViaApi, test } from "./support/fixtures";

// Misma firma que `packages/api/src/services/notificaciones.ts`, con el secreto de la config e2e.
const e2eSecret = "e2e-secret-e2e-secret-e2e-secret-e2e";
const tokenDeBaja = (userId: string) =>
  `${Buffer.from(userId).toString("base64url")}.${createHmac("sha256", e2eSecret)
    .update(`baja-novedades:${userId}`)
    .digest("base64url")}`;

const switchNovedades = "Recibir novedades por correo";
const switchAvisos = "Recibir avisos institucionales por correo";

test.describe("Correo de novedades", () => {
  test("el estudiante activa cada opción, persiste al recargar y arrancan desactivadas", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/preferencias");
    await expect(page.getByRole("switch", { name: switchNovedades })).not.toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).not.toBeChecked();

    await page.getByRole("switch", { name: switchNovedades }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Preferencias guardadas")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("switch", { name: switchNovedades })).toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).not.toBeChecked();
  });

  test("la baja funciona sin sesión, desactiva solo novedades y un enlace alterado da error", async ({
    authenticatedPage: page,
    browser,
    baseURL,
  }) => {
    const { userId } = await readMeViaApi(page.request);
    await page.goto("/preferencias");
    await page.getByRole("switch", { name: switchNovedades }).click();
    await page.getByRole("switch", { name: switchAvisos }).click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Preferencias guardadas")).toBeVisible();

    const anonymous = await browser.newContext({ baseURL });
    const baja = await anonymous.newPage();
    const token = tokenDeBaja(userId);

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
        "Listo. Ya no vas a recibir novedades de clase por correo. Podés volver a activarlas desde Preferencias.",
      ),
    ).toBeVisible();
    await anonymous.close();

    await page.goto("/preferencias");
    await expect(page.getByRole("switch", { name: switchNovedades })).not.toBeChecked();
    await expect(page.getByRole("switch", { name: switchAvisos })).toBeChecked();
  });
});
