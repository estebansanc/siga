import type { Page } from "@playwright/test";

import {
  borrarClaseDeAsistencia,
  crearClaseDeAsistenciaHoy,
  enlaceDelUltimoCorreo,
} from "./support/db";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  newUser,
  registerViaUi,
  seededUsers,
  test,
  verifyEmailViaLink,
} from "./support/fixtures";

const dniAleatorio = () => String(10_000_000 + Math.floor(Math.random() * 89_999_999));

const fila = (page: Page, texto: string) => page.getByRole("row").filter({ hasText: texto });

const accionDeFila = async (page: Page, nombre: string, accion: string) => {
  await page.getByRole("button", { name: `Acciones de ${nombre}` }).click();
  await page.getByRole("menuitem", { name: accion }).click();
};

const completarAlta = async (
  page: Page,
  datos: { nombre: string; dni: string; correo: string },
) => {
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo usuario" });
  await dialog.getByLabel("Apellido y nombre").fill(datos.nombre);
  await dialog.getByLabel("DNI").fill(datos.dni);
  await dialog.getByLabel("Correo").fill(datos.correo);
  return dialog;
};

test.describe("Usuarios", () => {
  test.afterEach(() => borrarClaseDeAsistencia());

  test("el bedel da de alta a un docente, que activa su cuenta; luego lo desactiva y lo reactiva", async ({
    page,
    browser,
    baseURL,
  }) => {
    const sufijo = Date.now().toString(36);
    const docente = {
      nombre: `Docente E2E ${sufijo}`,
      correo: `docente-${sufijo}@example.com`,
      dni: dniAleatorio(),
      password: "docente-e2e-1",
    };

    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    const dialog = await completarAlta(page, docente);
    await dialog.getByLabel("Perfil").selectOption("DOCENTE");
    await dialog.getByRole("checkbox", { name: "5K2 · Proyecto Final" }).check();
    await dialog.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Usuario creado")).toBeVisible();
    await expect(fila(page, docente.correo)).toContainText("Pendiente de activación");

    const repetido = await completarAlta(page, {
      nombre: "Otra persona",
      dni: docente.dni,
      correo: `otra-${sufijo}@example.com`,
    });
    await repetido.getByRole("button", { name: "Guardar" }).click();
    await expect(repetido.getByText("Ya existe un usuario con ese DNI")).toBeVisible();
    await repetido.getByRole("button", { name: "Cancelar" }).click();

    crearClaseDeAsistenciaHoy();
    const enlace = enlaceDelUltimoCorreo(docente.correo);
    const sesionDocente = await browser.newContext({ baseURL });
    const paginaDocente = await sesionDocente.newPage();
    await paginaDocente.goto(enlace);
    await paginaDocente.getByLabel("Contraseña").fill(docente.password);
    await paginaDocente.getByRole("button", { name: /Definir contraseña/ }).click();
    await expect(paginaDocente.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await expect(paginaDocente.getByText(/5K2/).first()).toBeVisible();

    const reuso = await sesionDocente.newPage();
    await reuso.goto(enlace);
    await reuso.getByLabel("Contraseña").fill("otra-clave-2");
    await reuso.getByRole("button", { name: /Definir contraseña/ }).click();
    await expect(reuso.getByText("El enlace ya no sirve")).toBeVisible();

    await page.reload();
    await expect(fila(page, docente.correo)).toContainText("Activo");

    await accionDeFila(page, docente.nombre, "Desactivar");
    await page.getByRole("alertdialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(fila(page, docente.correo)).toContainText("Desactivado");
    await paginaDocente.goto("/novedades");
    await expect(paginaDocente.getByText("Tu cuenta está desactivada")).toBeVisible();

    await accionDeFila(page, docente.nombre, "Reactivar");
    await expect(fila(page, docente.correo)).toContainText("Activo");
    await paginaDocente.goto("/");
    await expect(paginaDocente.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await sesionDocente.close();
  });

  test("en su propia cuenta el bedel no puede desactivarse ni cambiar su perfil", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/usuarios");
    await page.getByRole("button", { name: `Acciones de ${seededUsers.bedel.name}` }).click();
    await expect(page.getByRole("menuitem", { name: "Desactivar" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Editar" }).click();
    await expect(page.getByRole("dialog").getByLabel("Perfil")).toBeDisabled();
  });

  test("con dominios cargados el registro de otro dominio se rechaza; vacía la lista, se registra", async ({
    page,
    browser,
    baseURL,
  }) => {
    const usuario = newUser();
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/usuarios");
    await page.getByLabel("Dominios", { exact: true }).fill("frt.utn.edu.ar");
    await page.getByRole("button", { name: "Guardar dominios" }).click();
    await expect(page.getByText("Dominios guardados")).toBeVisible();

    const anonimo = await browser.newContext({ baseURL });
    const paginaAnonima = await anonimo.newPage();
    try {
      await paginaAnonima.goto("/registro");
      await paginaAnonima.getByLabel("Nombre y apellido").fill(usuario.name);
      await paginaAnonima.getByLabel("Email").fill(usuario.email);
      await paginaAnonima.getByLabel("Contraseña").fill(usuario.password);
      await paginaAnonima.getByRole("button", { name: "Crear cuenta" }).click();
      await expect(
        paginaAnonima.getByText("Solo se aceptan correos de frt.utn.edu.ar"),
      ).toBeVisible();
    } finally {
      await page.getByLabel("Dominios", { exact: true }).fill("");
      await page.getByRole("button", { name: "Guardar dominios" }).click();
      await expect(page.getByText("Se acepta cualquier dominio")).toBeVisible();
    }

    await registerViaUi(paginaAnonima, usuario);
    await verifyEmailViaLink(paginaAnonima, usuario);
    await expect(paginaAnonima.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await anonimo.close();
  });

  test("el estudiante no ve Usuarios, vuelve al inicio y de los docentes ve solo el nombre", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.estudiante);
    await expect(page.getByRole("link", { name: "Usuarios" })).toHaveCount(0);
    await page.goto("/usuarios");
    await expect(page).toHaveURL(/\/$/);

    const respuesta = await page.request.get("/api/v1/comisiones");
    const comisiones = (await respuesta.json()) as { docentes: object[] }[];
    const docentes = comisiones.flatMap((comision) => comision.docentes);
    expect(docentes.length).toBeGreaterThan(0);
    for (const docente of docentes) expect(Object.keys(docente).sort()).toEqual(["id", "nombre"]);
    expect((await page.request.get("/api/v1/usuarios")).status()).toBe(403);
  });
});
