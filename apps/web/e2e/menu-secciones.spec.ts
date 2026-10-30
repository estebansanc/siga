import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const seccionesDelBedel = ["Hoy", "Aulas", "Comunicación", "Administración"];

test.describe("Menú en secciones", () => {
  test("el bedel ve las secciones del menú y navega a un ítem", async ({ page, isMobile }) => {
    await loginViaUi(page, seededUsers.bedel);
    if (isMobile) await page.getByRole("button", { name: "Alternar menú lateral" }).click();

    const menu = page.locator('[data-sidebar="sidebar"]');
    for (const titulo of seccionesDelBedel) {
      await expect(menu.getByRole("group", { name: titulo })).toBeVisible();
    }
    await expect(menu.getByRole("link", { name: "Ayuda" })).toBeVisible();
    await expect(menu.locator('[data-slot="sidebar-group-label"] a')).toHaveCount(0);

    await menu
      .getByRole("group", { name: "Comunicación" })
      .getByRole("link", { name: "Avisos" })
      .click();
    await expect(page).toHaveURL(/\/avisos$/);
    if (isMobile) {
      await expect(page.getByRole("button", { name: "Alternar menú lateral" })).toBeVisible();
      await expect(menu).toBeHidden();
    } else {
      await expect(menu.getByRole("link", { name: "Avisos" })).toHaveAttribute("data-active", "");
    }
  });

  test("el estudiante conserva el menú plano, sin secciones", async ({ page, isMobile }) => {
    await loginViaUi(page, seededUsers.estudiante);
    if (isMobile) await page.getByRole("button", { name: "Alternar menú lateral" }).click();
    await expect(page.locator('[data-slot="sidebar-group-label"]')).toHaveCount(0);
  });
});
