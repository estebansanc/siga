import { diaSemanaDe, fechaArgentina, sumarDias } from "@repo/domain";

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

  test("el docente va de Aulas a sus solicitudes y desde su panel a Solicitar aula", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/aulas");
    await expect(page).toHaveURL(/\/aulas\/mis-solicitudes$/);
    await expect(page.getByRole("button", { name: "Nueva aula" })).toHaveCount(0);

    await page.goto("/");
    await page.getByRole("link", { name: /Solicitar aula/ }).click();
    await expect(page).toHaveURL(/\/aulas\/solicitar$/);
    await expect(page.getByRole("heading", { name: "Solicitar aula" })).toBeVisible();
  });

  test("el estudiante no accede a Solicitar aula", async ({ page }) => {
    await loginViaUi(page, seededUsers.estudiante);
    await page.goto("/aulas/solicitar");
    await expect(page).not.toHaveURL(/\/aulas\/solicitar/);
  });
});

const proximoDiaHabil = () => {
  let fecha = sumarDias(fechaArgentina(new Date()), 1);
  while ([6, 7].includes(diaSemanaDe(fecha))) fecha = sumarDias(fecha, 1);
  return fecha;
};

test.describe("Solicitar aula", () => {
  test("el bedel busca, solicita un aula y una segunda solicitud para la clase se rechaza", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/aulas/mis-solicitudes");
    await page.getByRole("link", { name: "Solicitar aula" }).click();
    await expect(page).toHaveURL(/\/aulas\/solicitar$/);
    await expectNoHorizontalPageScroll(page);

    await page.getByLabel("Fecha").fill(proximoDiaHabil());
    const clase = page.getByLabel("Clase");
    await expect(clase.locator("option")).not.toHaveCount(1);
    await clase.selectOption({ index: 1 });
    await expect(page.getByText(/Franja \d\d:\d\d a \d\d:\d\d/)).toBeVisible();

    await page.getByLabel("Cantidad de alumnos").fill("0");
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await expect(page.getByText("Ingresá una cantidad de alumnos mayor que 0.")).toBeVisible();

    await page.getByLabel("Cantidad de alumnos").fill("100");
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await expect(page.getByText("Ninguna aula cumple todos los criterios.")).toBeVisible();
    await expect(page.getByText(/Capacidad para 100 alumnos/).first()).toBeVisible();

    await page.getByLabel("Cantidad de alumnos").fill("40");
    await page.getByRole("checkbox", { name: "Proyector" }).check();
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await page
      .getByRole("button", { name: /^Elegir / })
      .first()
      .click();
    await page.getByRole("button", { name: "Confirmar solicitud" }).click();

    await expect(page).toHaveURL(/\/aulas\/mis-solicitudes$/);
    await expect(page.getByText("Pendiente").first()).toBeVisible();

    await page.goto("/aulas/solicitar");
    await page.getByLabel("Fecha").fill(proximoDiaHabil());
    await expect(page.getByLabel("Clase").locator("option")).not.toHaveCount(1);
    await page.getByLabel("Clase").selectOption({ index: 1 });
    await page.getByLabel("Cantidad de alumnos").fill("10");
    await page.getByRole("button", { name: "Buscar aulas" }).click();
    await page
      .getByRole("button", { name: /^Elegir / })
      .first()
      .click();
    await page.getByRole("button", { name: "Confirmar solicitud" }).click();
    await expect(page.getByText("Esta clase ya tiene una solicitud pendiente.")).toBeVisible();
  });
});
