import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

test.describe("Aulas", () => {
  test("el bedel da de alta, edita, da de baja y reactiva un aula", async ({ page }) => {
    const codigo = `Aula E2E ${Date.now().toString(36)}`;
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/aulas");
    await expect(page.getByRole("heading", { name: "Aulas" })).toBeVisible();
    await expect(page.locator('[data-slot="item"]').filter({ hasText: /^Aula 7/ })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.getByRole("button", { name: "Nueva aula" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva aula" });
    await dialog.getByLabel("Código").fill("Aula 7");
    await dialog.getByLabel("Edificio").fill("Edificio C");
    await dialog.getByLabel("Piso").fill("PB");
    await dialog.getByLabel("Capacidad").fill("501");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog.getByText("La capacidad máxima es 500")).toBeVisible();

    await dialog.getByLabel("Capacidad").fill("35");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog.getByText("Ya existe un aula con ese código")).toBeVisible();

    await dialog.getByLabel("Código").fill(codigo);
    await dialog.getByRole("checkbox", { name: "Pizarra" }).check();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Aula creada")).toBeVisible();
    const item = page.locator('[data-slot="item"]').filter({ hasText: codigo });
    await expect(item).toContainText("35 lugares");
    await expect(item).toContainText("Disponible");

    await item.getByRole("button", { name: `Acciones de ${codigo}` }).click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    const edicion = page.getByRole("dialog", { name: `Editar ${codigo}` });
    await edicion.getByLabel("Estado").selectOption("EN_MANTENIMIENTO");
    await edicion.getByLabel("Capacidad").fill("40");
    await edicion.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Aula actualizada")).toBeVisible();
    await expect(item).toContainText("40 lugares");
    await expect(item).toContainText("En mantenimiento");

    await item.getByRole("button", { name: `Acciones de ${codigo}` }).click();
    await page.getByRole("menuitem", { name: "Dar de baja" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Dar de baja" }).click();
    await expect(page.getByText(`${codigo} dada de baja`)).toBeVisible();
    await expect(item).toHaveCount(0);

    await page.getByRole("button", { name: "Dadas de baja" }).click();
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: `Acciones de ${codigo}` }).click();
    await page.getByRole("menuitem", { name: "Reactivar" }).click();
    await expect(page.getByText(`${codigo} reactivada`)).toBeVisible();
    await expect(item).toHaveCount(0);
  });

  test("el detalle muestra los datos del aula y sus clases", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/aulas");
    const item = page.locator('[data-slot="item"]').filter({ hasText: /^Aula 12/ });
    await item.getByRole("button", { name: "Detalle" }).click();
    const dialog = page.getByRole("dialog", { name: "Aula 12" });
    await expect(dialog).toContainText("Edificio A");
    await expect(dialog.getByText("Clases de hoy y los próximos 7 días")).toBeVisible();
  });

  test("un docente ve Próximamente en Aulas", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/aulas");
    await expect(page.getByText("Próximamente")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nueva aula" })).toHaveCount(0);
  });
});
