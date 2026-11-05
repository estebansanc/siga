import type { Page } from "@playwright/test";
import { fechaArgentina, sumarDias } from "@repo/domain";

import { diasNoLaborablesCargados } from "./support/db";
import { planearFechasDeClases } from "./support/fechas-de-clases";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  logoutViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

const filas = (page: Page, ...textos: (string | RegExp)[]) =>
  textos.reduce(
    (items, texto) => items.filter({ hasText: texto }),
    page.locator('[data-slot="item"]'),
  );

const abrirDialogo = async (page: Page, boton: string, titulo: string) => {
  await page.getByRole("button", { name: boton }).click();
  return page.getByRole("dialog", { name: titulo });
};

const accionDeFila = async (page: Page, titulo: string, accion: string) => {
  await page.getByRole("button", { name: `Acciones de ${titulo}` }).click();
  await page.getByRole("menuitem", { name: accion }).click();
};

test.describe("Datos académicos", () => {
  test("el bedel carga las seis entidades, genera las clases y las baja con el horario", async ({
    page,
  }) => {
    const sufijo = Date.now().toString(36);
    const carrera = { codigo: `E${sufijo}`, nombre: `Carrera E2E ${sufijo}` };
    const materia = { codigo: `M${sufijo}`, nombre: `Materia E2E ${sufijo}` };
    const periodo = `Período E2E ${sufijo}`;
    const comisionA = `E2E-A-${sufijo}`;
    const comisionB = `E2E-B-${sufijo}`;
    const hoy = process.env.E2E_HOY ?? fechaArgentina(new Date());
    const fechas = planearFechasDeClases(hoy, diasNoLaborablesCargados());
    const dentroDeUnaSemana = fechas.diaNoLaborable;
    const dentroDeDosSemanas = fechas.claseGenerada;

    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/datos-academicos");
    await expect(page.getByRole("heading", { name: "Datos académicos" })).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(6);
    await expectNoHorizontalPageScroll(page);

    // Carreras
    let dialog = await abrirDialogo(page, "Nueva carrera", "Nueva carrera");
    await dialog.getByLabel("Código").fill(carrera.codigo);
    await dialog.getByLabel("Nombre").fill(carrera.nombre);
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Carrera creada")).toBeVisible();
    await expect(filas(page, carrera.nombre)).toBeVisible();

    dialog = await abrirDialogo(page, "Nueva carrera", "Nueva carrera");
    await dialog.getByLabel("Código").fill(carrera.codigo);
    await dialog.getByLabel("Nombre").fill("Otra carrera");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(dialog.getByText("Ya existe una carrera con ese código")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar" }).click();

    // Materias
    await page.getByRole("tab", { name: "Materias" }).click();
    dialog = await abrirDialogo(page, "Nueva materia", "Nueva materia");
    await dialog.getByLabel("Carrera", { exact: true }).selectOption({ label: carrera.nombre });
    await dialog.getByLabel("Código").fill(materia.codigo);
    await dialog.getByLabel("Nombre").fill(materia.nombre);
    await dialog.getByLabel("Año de la carrera").fill("5");
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Materia creada")).toBeVisible();
    await expect(filas(page, materia.nombre)).toBeVisible();

    // Períodos: fin antes del inicio falla; mañana a dentro de 30 días queda listado
    await page.getByRole("tab", { name: "Períodos" }).click();
    dialog = await abrirDialogo(page, "Nuevo período", "Nuevo período");
    await dialog.getByLabel("Nombre").fill(periodo);
    await dialog.getByLabel("Inicio").fill(sumarDias(hoy, 10));
    await dialog.getByLabel("Fin").fill(sumarDias(hoy, 5));
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(
      dialog.getByText("La fecha de fin debe ser posterior a la de inicio"),
    ).toBeVisible();
    await dialog.getByLabel("Inicio").fill(fechas.inicio);
    await dialog.getByLabel("Fin").fill(fechas.fin);
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Período creado")).toBeVisible();
    await expect(filas(page, periodo)).toBeVisible();

    // Días no laborables
    await page.getByRole("tab", { name: "Días no laborables" }).click();
    dialog = await abrirDialogo(page, "Nuevo día no laborable", "Nuevo día no laborable");
    await dialog.getByLabel("Fecha").fill(dentroDeUnaSemana);
    await dialog.getByLabel("Motivo").fill(`Feriado E2E ${sufijo}`);
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Día no laborable creado")).toBeVisible();

    // Comisiones: el selector lista al Docente y no al usuario Bedel
    await page.getByRole("tab", { name: "Comisiones" }).click();
    const crearComision = async (codigo: string, docente?: string) => {
      const nueva = await abrirDialogo(page, "Nueva comisión", "Nueva comisión");
      await nueva.getByLabel("Materia").selectOption({ label: materia.nombre });
      await nueva.getByLabel("Período").selectOption({ label: periodo });
      await nueva.getByLabel("Código").fill(codigo);
      const docentes = nueva.getByRole("group", { name: "Docentes" });
      await expect(
        docentes.getByRole("checkbox", { name: seededUsers.docente.name }),
      ).toBeVisible();
      await expect(docentes.getByRole("checkbox", { name: seededUsers.bedel.name })).toHaveCount(0);
      if (docente) await docentes.getByRole("checkbox", { name: docente }).check();
      await nueva.getByRole("button", { name: "Guardar" }).click();
      await expect(page.getByText("Comisión creada")).toBeVisible();
    };
    await crearComision(comisionA, seededUsers.docente.name);
    await expect(filas(page, comisionA)).toContainText(seededUsers.docente.name);
    await crearComision(comisionB);
    await expect(filas(page, comisionB)).toContainText("Sin docentes");

    // Horarios: el aula ocupada nombra la comisión que ya la usa
    await page.getByRole("tab", { name: "Horarios" }).click();
    const dia = String(fechas.diaSemana);
    const cargarHorario = async (comision: string, desde: string, hasta: string) => {
      const nuevo = await abrirDialogo(page, "Nuevo horario", "Nuevo horario");
      await nuevo.getByLabel("Comisión").selectOption({ label: `${comision} · ${materia.nombre}` });
      await nuevo.getByLabel("Día").selectOption(dia);
      await nuevo.getByLabel("Desde", { exact: true }).fill(desde);
      await nuevo.getByLabel("Hasta").fill(hasta);
      await nuevo.getByLabel("Aula habitual").selectOption("aula-14");
      await nuevo.getByRole("button", { name: "Guardar" }).click();
      return nuevo;
    };
    await cargarHorario(comisionA, "06:00", "07:00");
    await expect(page.getByText("Horario creado")).toBeVisible();
    const conflicto = await cargarHorario(comisionB, "06:30", "07:30");
    await expect(
      conflicto.getByText(new RegExp(`ya está asignada a la comisión ${comisionA}`)),
    ).toBeVisible();
    await conflicto.getByRole("button", { name: "Cancelar" }).click();

    // Generar clases desde el período; regenerar no crea nada
    await page.getByRole("tab", { name: "Períodos" }).click();
    await accionDeFila(page, periodo, "Generar clases");
    await page.getByRole("button", { name: "Generar clases" }).click();
    const resumen = page.getByLabel("Resumen de la generación");
    await expect(resumen).toContainText(new RegExp(`Creadas\\s*${fechas.clasesEsperadas}(?!\\d)`));
    await page.getByRole("button", { name: "Cerrar" }).click();
    await accionDeFila(page, periodo, "Generar clases");
    await page.getByRole("button", { name: "Generar clases" }).click();
    await expect(page.getByLabel("Resumen de la generación")).toContainText(/Creadas\s*0/);
    await page.getByRole("button", { name: "Cerrar" }).click();

    // /clases: Programada con aula, salvo el día no laborable
    const buscarClases = async (fecha: string) => {
      await page.goto("/clases");
      await page.getByLabel("Fecha").fill(fecha);
      await page.getByLabel("Materia").selectOption({ label: materia.nombre });
    };
    await buscarClases(dentroDeDosSemanas);
    const clase = filas(page, comisionA);
    await expect(clase).toContainText("Programada");
    await expect(clase).toContainText("Aula 14");
    await buscarClases(dentroDeUnaSemana);
    await expect(page.getByText(comisionA)).toHaveCount(0);

    // Bajas: la carrera con materias activas se rechaza; el horario saca sus clases
    await page.goto("/datos-academicos");
    await accionDeFila(page, carrera.nombre, "Dar de baja");
    await page.getByRole("alertdialog").getByRole("button", { name: "Dar de baja" }).click();
    await expect(
      page.getByText(/No se puede dar de baja la carrera: tiene 1 materia activa/),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Horarios" }).click();
    await accionDeFila(page, `${comisionA} · ${materia.nombre}`, "Dar de baja");
    await page.getByRole("alertdialog").getByRole("button", { name: "Dar de baja" }).click();
    await page.getByRole("button", { name: "De baja", exact: true }).click();
    await expect(filas(page, comisionA, "De baja")).toBeVisible();
    await buscarClases(dentroDeDosSemanas);
    await expect(page.getByText(comisionA)).toHaveCount(0);
  });

  test("la Autoridad accede y Docente y Estudiante ven Acceso denegado", async ({ page }) => {
    await loginViaUi(page, seededUsers.autoridad);
    await page.goto("/datos-academicos");
    await expect(page.getByRole("tab")).toHaveCount(6);
    await logoutViaUi(page);

    for (const usuario of [seededUsers.docente, seededUsers.estudiante]) {
      await loginViaUi(page, usuario);
      await page.goto("/datos-academicos");
      await expect(page.getByText("Acceso denegado")).toBeVisible();
      await expect(page.getByRole("tab")).toHaveCount(0);
      const respuesta = await page.request.get("/api/v1/carreras/gestion");
      expect(respuesta.status()).toBe(403);
      expect((await respuesta.json()).error.message).toBe("Acceso denegado");
      await logoutViaUi(page);
    }
  });
});
