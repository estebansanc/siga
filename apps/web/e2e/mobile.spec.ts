import type { Page } from "@playwright/test";

import {
  crearClaseDeHoyConAula,
  crearNovedadesDeHistorial,
  eliminarClaseConAula,
} from "./support/clase-de-hoy";
import { publicarPolitica, retirarPolitica, verificarCorreo } from "./support/db";
import {
  expect,
  newUser,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

test.describe("Móvil", () => {
  test("la recuperación de contraseña se ofrece en /login y sus pantallas no scrollean a lo ancho", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/recuperar-contrasena");
    await expect(page.getByRole("button", { name: "Enviar enlace" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/definir-contrasena?token=cualquiera");
    await expect(page.getByText("El enlace venció o ya fue usado.")).toBeVisible();
    await expectNoHorizontalPageScroll(page);
  });

  test("el inicio abre con el menú hamburguesa y la tipografía es Google Sans, igual que en desktop", async ({
    authenticatedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al viewport de celular");
    await expect(page.getByRole("button", { name: "Alternar menú lateral" })).toBeVisible();
    const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(fontFamily).toContain("Google Sans");
  });

  test("en Asistencia docente las tarjetas se apilan sin scroll horizontal", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al viewport de celular");
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/qr");
    const generar = await page.getByText("Generar QR", { exact: true }).first().boundingBox();
    const manual = await page.getByText("Registro manual", { exact: true }).first().boundingBox();
    expect(manual!.y).toBeGreaterThan(generar!.y + generar!.height);
    await expectNoHorizontalPageScroll(page);
  });

  test("ninguna pantalla principal del estudiante scrollea a lo ancho", async ({ page }) => {
    await loginViaUi(page, seededUsers.estudiante);
    await expect(page.getByRole("heading", { name: "Mis clases de hoy" })).toBeVisible();
    await expect(page.getByText(/\d+ clases? · 5K2/)).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/clases");
    await expect(page.getByRole("heading", { name: "Clases", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Comisión")).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/mi-cuenta/comisiones");
    await expect(page.getByText("Comisiones que seguís")).toBeVisible();
    await expect(page.getByText("Proyecto Final").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: "Notificaciones" })).toBeInViewport();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/estado-institucional");
    await expect(page.getByText("Historial")).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/mi-cuenta");
    await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);
  });

  test("las pantallas del bedel y el pop-up de novedad del docente no scrollean a lo ancho", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await expect(page.getByRole("heading", { name: "Estado institucional" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cambiar estado" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    await expect(page.getByRole("dialog", { name: "Publicar novedad" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);
    await page.keyboard.press("Escape");

    await page.goto("/qr");
    await expect(page.getByRole("button", { name: "Generar QR" })).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.goto("/solicitudes");
    await expect(page.getByText(/^Clases sin aula \(\d+\)$/)).toBeVisible();
    for (const estado of ["Aprobadas", "Rechazadas"]) {
      await page.getByRole("button", { name: estado, exact: true }).click();
    }
    await page.getByRole("button", { name: "Qué significa cada estado" }).click();
    await expect(page.getByText(/la clase conservó su aula/)).toBeVisible();
    await expectNoHorizontalPageScroll(page);
  });

  test("elegir una sección en el menú lateral navega y lo cierra", async ({
    authenticatedPage: page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al menú lateral móvil");
    await page.getByRole("button", { name: "Alternar menú lateral" }).click();
    const sidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]');
    await sidebar.getByRole("link", { name: "Clases", exact: true }).click();
    await expect(page).toHaveURL(/\/clases/);
    await expect(sidebar).toBeHidden();
  });

  test("incidencias del bedel: listado, formulario y detalle con historial no scrollean a lo ancho", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    const codigo = `Aula Mov ${Date.now().toString(36)}`;
    const aula = await page.request.post("/api/v1/aulas", {
      data: { codigo, edificio: "Edificio C", piso: "PB", capacidad: 30 },
    });
    const { id: aulaId } = (await aula.json()) as { id: string };
    const creada = await page.request.post("/api/v1/incidencias", {
      data: {
        aulaId,
        elemento: "MOBILIARIO",
        descripcion: "Faltan sillas y las que hay están rotas, con una descripción larga.",
        gravedad: "LEVE",
      },
    });
    const { id } = (await creada.json()) as { id: string };
    await page.request.post(`/api/v1/incidencias/${id}/estado`, {
      data: { estado: "EN_CURSO", observaciones: "Se pidió reposición al área de mantenimiento" },
    });

    const sinScrollHorizontalEnDialogo = async () => {
      const desborde = await page
        .getByRole("dialog")
        .last()
        .evaluate((dialog) => dialog.scrollWidth - dialog.clientWidth);
      expect(desborde).toBeLessThanOrEqual(0);
      await expectNoHorizontalPageScroll(page);
    };

    await page.goto("/incidencias");
    await expect(page.getByRole("heading", { name: "Incidencias" }).first()).toBeVisible();
    const item = page.locator('[data-slot="item"]').filter({ hasText: `${codigo} · Mobiliario` });
    await expect(item).toBeVisible();
    await expectNoHorizontalPageScroll(page);

    await page.getByRole("button", { name: "Nueva incidencia" }).click();
    const reporte = page.getByRole("dialog", { name: "Nueva incidencia" });
    await expect(reporte.getByLabel("Elemento afectado")).toBeVisible();
    await reporte.getByRole("button", { name: "Reportar" }).click();
    await expect(reporte.getByText("Ingresá una descripción")).toBeVisible();
    await sinScrollHorizontalEnDialogo();
    await reporte.getByRole("button", { name: "Cancelar" }).click();

    await item.getByRole("button", { name: "Detalle" }).click();
    const detalle = page.getByRole("dialog", { name: `${codigo} · Mobiliario` });
    await expect(detalle.getByText("Se pidió reposición al área de mantenimiento")).toBeVisible();
    await sinScrollHorizontalEnDialogo();
    await page.keyboard.press("Escape");

    await page.request.post(`/api/v1/aulas/${aulaId}/baja`);
  });

  test("Datos académicos no scrollea a lo ancho en ninguna de sus seis pestañas", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/datos-academicos");
    await expect(page.getByRole("heading", { name: "Datos académicos" })).toBeVisible();
    for (const pestania of [
      "Carreras",
      "Materias",
      "Períodos",
      "Comisiones",
      "Horarios",
      "Días no laborables",
    ]) {
      await page.getByRole("tab", { name: pestania }).click();
      await expect(page.getByRole("tab", { name: pestania, selected: true })).toBeVisible();
      await expectNoHorizontalPageScroll(page);
    }
  });

  test("Usuarios del bedel no scrollea a lo ancho", async ({ page }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
    await expect(page.getByText("Rosa Benítez").first()).toBeVisible();
    await expectNoHorizontalPageScroll(page);
  });

  test("la política de privacidad deja las acciones a la vista y no scrollea a lo ancho", async ({
    page,
    request,
  }) => {
    const user = newUser();
    await request.post("/api/auth/sign-up/email", { data: user });
    verificarCorreo(user.email);
    const parrafo = "Texto de la versión tres de la política de privacidad. ".repeat(12);
    publicarPolitica(3, Array.from({ length: 15 }, () => parrafo).join("\n\n"));
    try {
      await loginViaUi(page, user);
      await expect(page).toHaveURL(/\/politica-de-privacidad/);
      await expect(page.getByRole("button", { name: "Aceptar y continuar" })).toBeInViewport();
      await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeInViewport();
      await expectNoHorizontalPageScroll(page);

      const texto = page.getByTestId("politica-texto").locator("[data-slot=scroll-area-viewport]");
      expect(await texto.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await texto.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
      expect(await texto.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await expect(page.getByRole("button", { name: "Aceptar y continuar" })).toBeInViewport();
    } finally {
      retirarPolitica(3);
    }
  });

  test("las pestañas de Datos académicos se desplazan a lo ancho sin superponerse ni mover la página", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al viewport de celular");
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/datos-academicos");
    const lista = page.getByRole("tablist");
    await expect(lista).toBeVisible();
    expect(await lista.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await expect(lista).toHaveAttribute("data-fade-end", "");
    await expect(lista).not.toHaveAttribute("data-fade-start", "");

    const cajas = await page.getByRole("tab").evaluateAll((tabs) =>
      tabs.map((tab) => {
        const { left, right } = tab.getBoundingClientRect();
        return { left, right };
      }),
    );
    cajas.slice(1).forEach((caja, indice) => {
      expect(caja.left).toBeGreaterThanOrEqual(cajas[indice].right - 1);
    });

    const fueraDelDesvanecido = async (nombre: string) => {
      const tab = page.getByRole("tab", { name: nombre });
      const desvanecido = await lista.evaluate(
        (el) => 2 * parseFloat(getComputedStyle(el).fontSize),
      );
      await expect
        .poll(async () => {
          const caja = (await tab.boundingBox())!;
          const cajaLista = (await lista.boundingBox())!;
          const alInicio = (await lista.evaluate((el) => el.scrollLeft)) < 1;
          const alFinal = await lista.evaluate(
            (el) => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
          );
          const izquierda = alInicio || caja.x >= cajaLista.x + desvanecido - 1;
          const derecha =
            alFinal || caja.x + caja.width <= cajaLista.x + cajaLista.width - desvanecido + 1;
          return izquierda && derecha;
        })
        .toBe(true);
    };

    await page.getByRole("tab", { name: "Días no laborables" }).click();
    await expect(page.getByRole("tab", { name: "Días no laborables" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(lista).toHaveAttribute("data-fade-start", "");
    await expect(lista).not.toHaveAttribute("data-fade-end", "");
    await fueraDelDesvanecido("Días no laborables");
    await expectNoHorizontalPageScroll(page);

    await page.getByRole("tab", { name: "Carreras" }).click();
    await expect(lista).toHaveAttribute("data-fade-end", "");
    await expect(lista).not.toHaveAttribute("data-fade-start", "");
    await fueraDelDesvanecido("Carreras");

    await page.getByRole("tab", { name: "Horarios" }).click();
    await fueraDelDesvanecido("Horarios");
  });

  test("con teclado las flechas mueven el foco entre pestañas y la enfocada queda a la vista", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al viewport de celular");
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/datos-academicos");
    const lista = page.getByRole("tablist");
    await page.getByRole("tab", { name: "Carreras" }).focus();
    for (const nombre of ["Materias", "Períodos", "Comisiones", "Horarios", "Días no laborables"]) {
      await page.keyboard.press("ArrowRight");
      const tab = page.getByRole("tab", { name: nombre });
      await expect(tab).toBeFocused();
      await expect
        .poll(async () => {
          const caja = (await tab.boundingBox())!;
          const cajaLista = (await lista.boundingBox())!;
          return (
            caja.x >= cajaLista.x - 1 && caja.x + caja.width <= cajaLista.x + cajaLista.width + 1
          );
        })
        .toBe(true);
    }
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Horarios" })).toBeFocused();
  });

  test.describe("Historiales a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

    test("los Historiales de Novedades e Incidencias, con filas, no scrollean a lo ancho", async ({
      page,
    }) => {
      const { limpiar } = await crearNovedadesDeHistorial();
      try {
        await loginViaUi(page, seededUsers.bedel);
        const aula = await page.request.post("/api/v1/aulas", {
          data: {
            codigo: `Aula 360 ${Date.now().toString(36)}`,
            edificio: "Edificio C",
            piso: "PB",
            capacidad: 30,
          },
        });
        const { id: aulaId } = (await aula.json()) as { id: string };
        const creada = await page.request.post("/api/v1/incidencias", {
          data: { aulaId, elemento: "MOBILIARIO", descripcion: "Sillas rotas", gravedad: "LEVE" },
        });
        const { id } = (await creada.json()) as { id: string };
        await page.request.post(`/api/v1/incidencias/${id}/estado`, {
          data: { estado: "RESUELTA" },
        });

        await page.goto("/novedades");
        await page.getByRole("tab", { name: "Historial" }).tap();
        await expect(page.locator('[data-slot="item"]').first()).toBeVisible();
        await expectNoHorizontalPageScroll(page);

        await page.goto("/incidencias");
        await page.getByRole("tab", { name: "Historial" }).tap();
        await expect(page.locator('[data-slot="item"]').first()).toBeVisible();
        await expectNoHorizontalPageScroll(page);

        await page.request.post(`/api/v1/aulas/${aulaId}/baja`);
      } finally {
        await limpiar();
      }
    });
  });

  test.describe("Ayuda a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

    test("Ayuda está en el menú, no scrollea a lo ancho y cada pestaña se abre con un toque", async ({
      page,
    }) => {
      await loginViaUi(page, seededUsers.docente);
      await page.getByRole("button", { name: "Alternar menú lateral" }).click();
      await page.getByRole("link", { name: "Ayuda" }).click();
      await expect(page.getByRole("heading", { name: "Ayuda" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Guía rápida", selected: true })).toBeVisible();
      await expectNoHorizontalPageScroll(page);

      await page.getByRole("tab", { name: "Manual de usuario" }).tap();
      await expect(
        page.getByRole("tab", { name: "Manual de usuario", selected: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Asistencia" }).first().click();
      await expectNoHorizontalPageScroll(page);

      await page.getByRole("tab", { name: "Guía rápida" }).tap();
      await expect(page.getByRole("tab", { name: "Guía rápida", selected: true })).toBeVisible();
    });
  });

  test.describe("Tarjeta de clase del Docente a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

    test("muestra ⋯ sin botones de texto, sin scroll a lo ancho, y el menú deja publicar con ítems de 44 px", async ({
      page,
    }) => {
      const { aulaId, claseId } = await crearClaseDeHoyConAula(new Date(Date.now() - 5 * 60_000));
      try {
        await loginViaUi(page, seededUsers.docente);
        await page.goto("/");
        const tarjeta = page.locator(`[data-clase-id="${claseId}"]`);
        await expect(tarjeta.getByRole("button", { name: /^Acciones de/ })).toBeVisible();
        await expect(tarjeta.getByRole("button", { name: /^(Incidencia|Novedad)$/ })).toHaveCount(
          0,
        );
        await expectNoHorizontalPageScroll(page);

        await tarjeta.getByRole("button", { name: /^Acciones de/ }).tap();
        const reportar = page.getByRole("menuitem", { name: "Reportar incidencia" });
        const publicar = page.getByRole("menuitem", { name: "Publicar novedad" });
        for (const item of [reportar, publicar]) {
          await expect(item).toBeEnabled();
          await expect
            .poll(async () => (await item.boundingBox())?.height ?? 0)
            .toBeGreaterThanOrEqual(43.5);
        }
        await publicar.tap();
        await expect(page.getByRole("dialog", { name: "Publicar novedad" })).toBeVisible();
        await expectNoHorizontalPageScroll(page);
      } finally {
        await eliminarClaseConAula(claseId, aulaId);
      }
    });
  });

  test("el link de una Virtual activa tiene zona táctil de 44 px y Novedades no scrollea a lo ancho", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const marca = Date.now().toString(36);
    const cuartaClase = new Date();
    for (let encontradas = 0; encontradas < 4;) {
      cuartaClase.setDate(cuartaClase.getDate() + 1);
      const dia = new Date(cuartaClase.getTime() - 3 * 60 * 60 * 1000);
      if ([1, 4].includes(new Date(`${dia.toISOString().slice(0, 10)}T12:00:00Z`).getUTCDay()))
        encontradas++;
    }
    const fecha = new Date(cuartaClase.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await loginViaUi(page, seededUsers.docente);
    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    const dialog = page.getByRole("dialog", { name: "Publicar novedad" });
    await dialog.getByLabel("Fecha de las clases").fill(fecha);
    await dialog.getByRole("checkbox", { name: /Proyecto Final · 5K2/ }).check();
    await dialog.getByRole("button", { name: "Virtual" }).click();
    await dialog
      .getByLabel("Enlace de la clase virtual")
      .fill("https://meet.google.com/abc-defg-hij");
    await dialog.getByLabel(/Mensaje para los estudiantes/).fill(`Por Meet (${marca})`);
    await dialog.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Novedad publicada")).toBeVisible();

    const novedad = page.locator('[data-slot="item"]').filter({ hasText: marca });
    const link = novedad.getByRole("link", { name: "Entrar a la clase virtual" });
    await expect(link).toBeVisible();
    const caja = await link.boundingBox();
    expect(caja?.width).toBeGreaterThanOrEqual(44);
    expect(caja?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalPageScroll(page);

    await novedad.getByRole("button", { name: /Acciones de la novedad/ }).click();
    await page.getByRole("menuitem", { name: "Finalizar novedad" }).click();
    await page.getByRole("button", { name: "Finalizar" }).click();
    await expect(page.getByText("Novedad finalizada")).toBeVisible();
  });

  test("el selector de hora se abre, permite elegir hora y minutos en 24 h y no scrollea a lo ancho", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica al viewport de celular");
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    await page.getByRole("button", { name: "Elegir hora" }).last().click();
    await page.getByRole("option", { name: "22", exact: true }).first().click();
    await page.getByRole("option", { name: "45", exact: true }).click();
    await expect(page.getByLabel("Noche: fin")).toHaveValue("22:45");
    await expect(page.getByText(/\b(AM|PM)\b/)).toHaveCount(0);
    await expectNoHorizontalPageScroll(page);
  });

  test.describe("Estado institucional a 360 px", () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

    const expectCardsInsideViewport = async (page: Page) => {
      const clipped = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return [...document.querySelectorAll<HTMLElement>("[data-slot=card]")]
          .filter((card) => {
            const outside = card.getBoundingClientRect().right > width + 0.5;
            const clippedInside = [...card.querySelectorAll<HTMLElement>("*")].some((el) => {
              const scroller = el.closest(".overflow-x-auto");
              return (
                !scroller &&
                el.getBoundingClientRect().right > card.getBoundingClientRect().right + 0.5
              );
            });
            return outside || card.scrollWidth > card.clientWidth || clippedInside;
          })
          .map((card) => card.textContent?.slice(0, 30));
      });
      expect(clipped).toEqual([]);
    };

    for (const perfil of ["bedel", "autoridad", "docente", "estudiante"] as const) {
      test(`${perfil}: ninguna tarjeta se corta por la derecha`, async ({ page }) => {
        await loginViaUi(page, seededUsers[perfil]);
        await page.goto("/estado-institucional");
        await expect(page.getByText("Historial")).toBeVisible();
        await expectNoHorizontalPageScroll(page);
        await expectCardsInsideViewport(page);
      });
    }

    test("el Bedel ve completo el botón Cambiar estado, la ayuda del Motivo con su contador", async ({
      page,
    }) => {
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/estado-institucional");
      await expect(page.getByLabel("Motivo", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Obligatorio para Cerrada y Abierta con novedades. Máximo 280 caracteres."),
      ).toBeInViewport({ ratio: 1 });
      await page.getByRole("button", { name: "Cambiar estado" }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: "Cambiar estado" })).toBeInViewport({
        ratio: 1,
      });
      await expectCardsInsideViewport(page);

      await page.getByLabel("Motivo", { exact: true }).fill("Prueba móvil");
      await expect(page.getByText("12 / 280")).toBeVisible();
    });
  });
});
