import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

test.describe("Horas en 24 h", () => {
  test.use({ locale: "en-US" });

  test("con el navegador en inglés los turnos se cargan y se ven en 24 h", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    const finDeNoche = page.getByLabel("Noche: fin");
    await expect(finDeNoche).toHaveValue("23:30");
    await expect(page.getByText(/\b(AM|PM)\b/)).toHaveCount(0);

    await finDeNoche.fill("23:15");
    await page.getByRole("button", { name: "Guardar turnos" }).click();
    await expect(page.getByText("Turnos actualizados")).toBeVisible();
    await expect(finDeNoche).toHaveValue("23:15");

    await page.goto("/qr");
    await expect(page.getByRole("option", { name: "Noche 18:00 – 23:15" })).toBeAttached();

    await page.goto("/configuracion");
    await page.getByLabel("Noche: fin").fill("23:30");
    await page.getByRole("button", { name: "Guardar turnos" }).click();
    await expect(page.getByText("Turnos actualizados").last()).toBeVisible();
  });

  test("el selector de hora se opera con teclado y deja la hora en 24 h", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    const finDeNoche = page.getByLabel("Noche: fin");
    await finDeNoche.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const horas = page.getByRole("listbox", { name: "Horas" });
    await expect(horas.getByRole("option", { name: "23" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(finDeNoche).toHaveValue("22:30");
    await page.keyboard.press("Escape");
    await expect(horas).toBeHidden();
  });
});
