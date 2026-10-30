import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const fechaArgentina = (instante: Date) =>
  new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

// La tercera clase de Proyecto Final 5K2 (lunes o jueves) desde mañana: otra que las de los demás
// tests de novedades, para que no se pisen.
const terceraClaseDeProyectoFinal = () => {
  const dia = new Date();
  let encontradas = 0;
  while (encontradas < 3) {
    dia.setDate(dia.getDate() + 1);
    if ([1, 4].includes(new Date(`${fechaArgentina(dia)}T12:00:00Z`).getUTCDay())) encontradas++;
  }
  return fechaArgentina(dia);
};

test.describe("Novedad Virtual", () => {
  test("la tarjeta muestra el link a la clase virtual y no la URL, y lo quita al finalizar", async ({
    page,
  }) => {
    const enlace = "https://meet.google.com/abc-defg-hij";
    const marca = Date.now().toString(36);

    await loginViaUi(page, seededUsers.docente);
    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    const dialog = page.getByRole("dialog", { name: "Publicar novedad" });
    await dialog.getByLabel("Fecha de las clases").fill(terceraClaseDeProyectoFinal());
    await dialog.getByRole("checkbox", { name: /Proyecto Final · 5K2/ }).check();
    await dialog.getByRole("button", { name: "Virtual" }).click();
    await dialog.getByLabel("Enlace de la clase virtual").fill(enlace);
    await dialog.getByLabel(/Mensaje para los estudiantes/).fill(`Por Meet (${marca})`);
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Novedad publicada")).toBeVisible();

    const novedad = page.locator('[data-slot="item"]').filter({ hasText: marca });
    const link = novedad.getByRole("link", { name: "Entrar a la clase virtual" });
    await expect(link).toHaveAttribute("href", enlace);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(novedad).not.toContainText(enlace);

    await novedad.getByRole("button", { name: /Acciones de la novedad/ }).click();
    await page.getByRole("menuitem", { name: "Finalizar novedad" }).click();
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page.getByText("Novedad finalizada")).toBeVisible();
    await page.getByRole("tab", { name: "Historial" }).click();
    await expect(novedad).toContainText("Finalizada");
    await expect(novedad.getByRole("link")).toHaveCount(0);
  });
});
