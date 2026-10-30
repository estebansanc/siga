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

  test("el bedel alterna Lista y Plano, ve el mismo detalle y la vista sobrevive a recargar", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await expect(page.getByRole("link", { name: "Plano de aulas" })).toHaveCount(0);
    await page.goto("/aulas");
    await expect(page.getByRole("button", { name: "Lista" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page
      .locator('[data-slot="item"]')
      .filter({ hasText: /^Aula 12/ })
      .getByRole("button", { name: "Detalle" })
      .click();
    const detalleLista = page.getByRole("dialog", { name: "Aula 12" });
    await expect(detalleLista.getByText("Reportar incidencia")).toBeVisible();
    const textoLista = await detalleLista.innerText();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Plano", exact: true }).click();
    await expect(page).toHaveURL(/vista=plano/);
    await expect(page.getByRole("button", { name: "Nueva aula" })).toBeVisible();
    await page.getByRole("button", { name: "Edificio A" }).click();
    await page.getByRole("button", { name: "1.º piso" }).click();
    await page.getByRole("button", { name: /^Aula 12/ }).click();
    const detallePlano = page.getByRole("dialog", { name: "Aula 12" });
    await expect(detallePlano.getByText("Reportar incidencia")).toBeVisible();
    expect(await detallePlano.innerText()).toBe(textoLista);
    await page.keyboard.press("Escape");

    await page.reload();
    await expect(page.getByRole("button", { name: "Plano", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("link", { name: "Aulas", exact: true }).click();
    await expect(page).toHaveURL(/\/aulas$/);
    await expect(page.getByRole("button", { name: "Lista" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Edificio A" })).toHaveCount(0);

    await page.goto("/plano-de-aulas");
    await expect(page).toHaveURL(/\/aulas\?vista=plano/);
  });

  test("el docente ve Solicitudes de aula en el menú y las URLs viejas llevan ahí", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.docente);
    await expect(page.getByRole("link", { name: "Solicitudes de aula" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aulas", exact: true })).toHaveCount(0);
    for (const ruta of ["/aulas", "/aulas/solicitar", "/aulas/mis-solicitudes"]) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/solicitudes$/);
      await expect(
        page.getByRole("heading", { name: "Solicitudes de aula", exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Nueva aula" })).toHaveCount(0);
  });

  test("el estudiante no accede a Solicitudes de aula", async ({ page }) => {
    await loginViaUi(page, seededUsers.estudiante);
    await page.goto("/solicitudes");
    await expect(page).not.toHaveURL(/\/solicitudes/);
  });
});

const proximoDiaHabil = () => {
  let fecha = sumarDias(fechaArgentina(new Date()), 1);
  while ([6, 7].includes(diaSemanaDe(fecha))) fecha = sumarDias(fecha, 1);
  return fecha;
};

const textoSinClases = (fecha: string) =>
  `El ${new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
    .format(new Date(`${fecha}T12:00:00Z`))
    .replace(
      ",",
      "",
    )} no tenés clases que admitan pedir aula. No aparecen las que ya terminaron ni las suspendidas, con ausencia docente o virtuales. Elegí otra fecha.`;

const proximoDomingo = () => {
  let fecha = sumarDias(fechaArgentina(new Date()), 1);
  while (diaSemanaDe(fecha) !== 7) fecha = sumarDias(fecha, 1);
  return fecha;
};

test.describe("Solicitar aula", () => {
  test("el docente busca, solicita un aula y una segunda solicitud para la clase se rechaza", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/solicitudes");
    await page.getByRole("button", { name: "Nueva solicitud" }).click();
    await expect(page.getByRole("dialog", { name: "Nueva solicitud" })).toBeVisible();
    await expect(page).toHaveURL(/\/solicitudes$/);
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

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Pendiente").first()).toBeVisible();

    await page.getByRole("button", { name: "Nueva solicitud" }).click();
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

  test("el docente ve el estado vacío en un día sin clases y el formulario en uno con clases", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/solicitudes");
    await page.getByRole("button", { name: "Nueva solicitud" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva solicitud" });

    await dialog.getByLabel("Fecha").fill(proximoDiaHabil());
    await dialog.getByLabel("Clase").selectOption({ index: 1 });
    await dialog.getByLabel("Cantidad de alumnos").fill("10");
    await dialog.getByRole("button", { name: "Buscar aulas" }).click();
    await expect(dialog.getByRole("region", { name: "Resultados" })).toBeVisible();

    await dialog.getByLabel("Fecha").fill(proximoDomingo());
    await expect(dialog.getByText("No hay clases para pedir aula")).toBeVisible();
    await expect(dialog.getByRole("region", { name: "Resultados" })).toHaveCount(0);
    await expect(dialog.getByText(textoSinClases(proximoDomingo()))).toBeVisible();
    await expect(dialog.getByLabel("Clase")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Buscar aulas" })).toHaveCount(0);
    await expectNoHorizontalPageScroll(page);

    await dialog.getByLabel("Fecha").fill(proximoDiaHabil());
    await expect(dialog.getByLabel("Clase")).toBeVisible();
    await expect(dialog.getByText("No hay clases para pedir aula")).toHaveCount(0);

    await dialog.getByLabel("Fecha").fill(proximoDomingo());
    await dialog.getByRole("button", { name: "Ver mis solicitudes" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/solicitudes$/);
  });

  test("en celular el estado vacío de Solicitar aula se ve completo dentro del diálogo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/solicitudes");
    await page.getByRole("button", { name: "Nueva solicitud" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva solicitud" });
    await dialog.getByLabel("Fecha").fill(proximoDomingo());
    const vacio = dialog.locator('[data-slot="empty"]');
    await expect(vacio).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Ver mis solicitudes" })).toBeVisible();
    const cajaDialogo = await dialog.boundingBox();
    const cajaVacio = await vacio.boundingBox();
    expect(cajaVacio!.x).toBeGreaterThanOrEqual(cajaDialogo!.x);
    expect(cajaVacio!.x + cajaVacio!.width).toBeLessThanOrEqual(
      cajaDialogo!.x + cajaDialogo!.width,
    );
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expectNoHorizontalPageScroll(page);
  });

  test("el bedel que abre las URLs viejas de Solicitar aula llega a Solicitudes", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    for (const ruta of ["/aulas/solicitar", "/aulas/mis-solicitudes"]) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/solicitudes$/);
    }
    await expect(page.getByRole("button", { name: "Nueva solicitud" })).toHaveCount(0);
  });
});
