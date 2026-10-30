import type { Page } from "@playwright/test";

import {
  borrarClaseDeAsistencia,
  crearClaseDeAsistenciaHoy,
  enlaceDelUltimoCorreo,
} from "./support/db";
import {
  aceptarPoliticaViaUi,
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

  for (const perfil of ["bedel", "autoridad"] as const) {
    test(`${perfil}: el Administrador lleva el distintivo y no se puede desactivar`, async ({
      page,
    }) => {
      await loginViaUi(page, seededUsers[perfil]);
      await page.goto("/usuarios");
      await expect(page.getByRole("row").filter({ hasText: "Administrador" })).toHaveCount(1);
      const admin = fila(page, seededUsers.bedel.email);
      await expect(admin).toContainText("Administrador");
      await expectNoHorizontalPageScroll(page);
      if (perfil === "autoridad") {
        await admin.getByRole("button", { name: /^Acciones de/ }).click();
        await expect(page.getByRole("menuitem", { name: "Editar" })).toBeVisible();
        await expect(page.getByRole("menuitem", { name: "Desactivar" })).toHaveCount(0);
      }
    });
  }

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
    await aceptarPoliticaViaUi(paginaDocente);
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

  test("el docente corrige su perfil y pide la baja; el bedel la ve, la resuelve y reactiva la cuenta", async ({
    page,
    browser,
    baseURL,
  }) => {
    const sufijo = Date.now().toString(36);
    const docente = {
      nombre: `Docente Baja ${sufijo}`,
      correo: `baja-${sufijo}@example.com`,
      dni: dniAleatorio(),
      password: "docente-e2e-1",
    };
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/usuarios");
    const alta = await completarAlta(page, docente);
    await alta.getByLabel("Perfil").selectOption("DOCENTE");
    await alta.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Usuario creado")).toBeVisible();

    const sesionDocente = await browser.newContext({ baseURL });
    const paginaDocente = await sesionDocente.newPage();
    await paginaDocente.goto(enlaceDelUltimoCorreo(docente.correo));
    await paginaDocente.getByLabel("Contraseña").fill(docente.password);
    await paginaDocente.getByRole("button", { name: /Definir contraseña/ }).click();
    await aceptarPoliticaViaUi(paginaDocente);

    await paginaDocente.goto("/mi-cuenta");
    await paginaDocente.getByLabel("Apellido y nombre").fill(`${docente.nombre} Editado`);
    await paginaDocente.getByLabel("Legajo").fill("L-BAJA");
    await paginaDocente.getByRole("button", { name: "Guardar" }).click();
    await expect(paginaDocente.getByText("Perfil actualizado")).toBeVisible();

    await paginaDocente.getByRole("button", { name: "Solicitar baja de mi cuenta" }).click();
    await paginaDocente.getByLabel("Motivo (opcional)").fill("Dejo la institución");
    await paginaDocente.getByRole("button", { name: "Solicitar baja", exact: true }).click();
    await expect(paginaDocente.getByText(/Baja solicitada el \d{2}\/\d{2}\/\d{4}/)).toBeVisible();
    await expect(
      paginaDocente.getByRole("button", { name: "Solicitar baja de mi cuenta" }),
    ).toHaveCount(0);
    await paginaDocente.goto("/");
    await expect(paginaDocente.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();

    await page.reload();
    await page.getByLabel("Filtrar por solicitud de baja").selectOption("Baja solicitada");
    const filaBaja = fila(page, docente.correo);
    await expect(filaBaja).toContainText(`${docente.nombre} Editado`);
    await expect(filaBaja).toContainText("Dejo la institución");

    await accionDeFila(page, `${docente.nombre} Editado`, "Desactivar");
    await page.getByRole("alertdialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(fila(page, docente.correo)).toHaveCount(0);
    await page.getByLabel("Filtrar por solicitud de baja").selectOption("Todas las cuentas");
    await expect(fila(page, docente.correo)).toContainText("Desactivado");
    await expect(fila(page, docente.correo)).not.toContainText("Baja solicitada");
    await paginaDocente.goto("/novedades");
    await expect(paginaDocente.getByText("Tu cuenta está desactivada")).toBeVisible();

    await accionDeFila(page, `${docente.nombre} Editado`, "Reactivar");
    await expect(fila(page, docente.correo)).not.toContainText("Desactivado");
    await paginaDocente.goto("/mi-cuenta");
    await expect(
      paginaDocente.getByRole("button", { name: "Solicitar baja de mi cuenta" }),
    ).toBeVisible();
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

  for (const { ancho, enUnaFila } of [
    { ancho: 1366, enUnaFila: true },
    { ancho: 768, enUnaFila: false },
  ]) {
    test(`a ${ancho} px los filtros y el placeholder se leen completos y los filtros no cambian de ancho`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: 850 });
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/usuarios");
      const buscador = page.getByLabel("Buscar usuarios");
      const perfil = page.getByLabel("Filtrar por perfil");
      const baja = page.getByLabel("Filtrar por solicitud de baja");
      const cajaBuscador = await buscador.boundingBox();
      const cajaPerfil = await perfil.boundingBox();
      const cajaBaja = await baja.boundingBox();
      expect(cajaPerfil?.y).toBe(cajaBaja?.y);
      if (enUnaFila) {
        expect(cajaBuscador?.y).toBe(cajaPerfil?.y);
      } else {
        expect(cajaPerfil!.y).toBeGreaterThan(cajaBuscador!.y + cajaBuscador!.height - 1);
      }

      const holguraDelTexto = (selector: typeof buscador, usaPlaceholder: boolean) =>
        selector.evaluate((el, placeholder) => {
          const campo = el as HTMLInputElement | HTMLSelectElement;
          const estilo = getComputedStyle(campo);
          const contexto = document.createElement("canvas").getContext("2d")!;
          contexto.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
          const texto = placeholder
            ? (campo as HTMLInputElement).placeholder
            : (campo as HTMLSelectElement).selectedOptions[0].text;
          const disponible =
            campo.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
          return disponible - contexto.measureText(texto).width;
        }, usaPlaceholder);

      expect(await holguraDelTexto(buscador, true)).toBeGreaterThanOrEqual(0);
      for (const { selector, opciones } of [
        { selector: perfil, opciones: ["Todos los perfiles", "Autoridad académica"] },
        { selector: baja, opciones: ["Todas las cuentas", "Baja solicitada"] },
      ]) {
        const caja = await selector.boundingBox();
        for (const opcion of opciones) {
          await selector.selectOption({ label: opcion });
          expect(await holguraDelTexto(selector, false)).toBeGreaterThanOrEqual(0);
          expect((await selector.boundingBox())?.width).toBe(caja?.width);
        }
        await selector.selectOption({ index: 0 });
      }
      await expectNoHorizontalPageScroll(page);
    });
  }

  test("en mobile el buscador y los filtros se apilan sin scroll horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/usuarios");
    const cajas = await Promise.all(
      ["Buscar usuarios", "Filtrar por perfil", "Filtrar por solicitud de baja"].map((nombre) =>
        page.getByLabel(nombre).boundingBox(),
      ),
    );
    expect(cajas[1]!.y).toBeGreaterThan(cajas[0]!.y);
    expect(cajas[2]!.y).toBeGreaterThan(cajas[1]!.y);
    await expectNoHorizontalPageScroll(page);
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
