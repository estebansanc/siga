import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

const guiaPorPerfil = [
  { perfil: "estudiante", tarea: "Elegir las comisiones que seguís" },
  { perfil: "docente", tarea: "Registrar tu asistencia con QR" },
  { perfil: "bedel", tarea: "Resolver una solicitud de aula" },
  { perfil: "autoridad", tarea: "Consultar los históricos" },
] as const;

test.describe("Ayuda", () => {
  for (const { perfil, tarea } of guiaPorPerfil) {
    test(`el ${perfil} abre Ayuda y ve su guía rápida`, async ({ page }) => {
      await loginViaUi(page, seededUsers[perfil]);
      await page.goto("/ayuda");
      await expect(page.getByRole("heading", { name: "Ayuda" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Guía rápida", selected: true })).toBeVisible();
      await expect(page.getByText(tarea)).toBeVisible();
      await page.getByRole("tab", { name: "Manual de usuario" }).click();
      await expect(page.getByRole("button", { name: "Mi perfil" })).toBeVisible();
      await expectNoHorizontalPageScroll(page);
    });
  }

  test("Ayuda es la última entrada del menú del bedel", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    const entradas = page.locator('[data-slot="sidebar-menu-button"]');
    await expect(entradas.last()).toHaveText("Ayuda");
    await entradas.last().click();
    await expect(page).toHaveURL(/\/ayuda$/);
  });
});
