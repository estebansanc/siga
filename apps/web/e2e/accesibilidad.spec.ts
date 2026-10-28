import type { Page } from "@playwright/test";

import {
  esperarSinHallazgos,
  type Hallazgo,
  foco,
  focoVisible,
  medirContraste,
  medirZonasTactiles,
} from "./support/accesibilidad";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
  type User,
} from "./support/fixtures";

const perfiles = {
  Estudiante: { user: seededUsers.estudiante, inicio: "Mis clases de hoy" },
  Docente: { user: seededUsers.docente, inicio: "Mis clases de hoy" },
  Bedel: { user: seededUsers.bedel, inicio: "Estado institucional" },
  Autoridad: { user: seededUsers.autoridad, inicio: "Clases de hoy" },
} satisfies Record<string, { user: User; inicio: string }>;

const rutasComunes = ["/", "/mi-perfil", "/avisos", "/clases"];
const rutasPorPerfil: Record<keyof typeof perfiles, string[]> = {
  Estudiante: ["/preferencias"],
  Docente: ["/asistencia", "/novedades", "/aulas"],
  Bedel: [
    "/novedades",
    "/aulas",
    "/plano-de-aulas",
    "/qr",
    "/solicitudes",
    "/incidencias",
    "/usuarios",
    "/datos-academicos",
    "/configuracion",
  ],
  Autoridad: ["/historico", "/plano-de-aulas", "/usuarios", "/datos-academicos"],
};

const esperarPantalla = async (page: Page) => {
  await page.waitForLoadState("networkidle");
};

test.describe("Accesibilidad por perfil", () => {
  for (const tema of ["light", "dark"] as const) {
    for (const [perfil, { user }] of Object.entries(perfiles) as [
      keyof typeof perfiles,
      (typeof perfiles)[keyof typeof perfiles],
    ][]) {
      test(`${perfil}: contraste AA en tema ${tema === "light" ? "claro" : "oscuro"}`, async ({
        page,
        isMobile,
      }) => {
        test.skip(isMobile, "El contraste se mide una sola vez, en escritorio");
        await page.emulateMedia({ colorScheme: tema });
        await loginViaUi(page, user);
        const hallazgos: string[] = [];
        for (const ruta of [...rutasComunes, ...rutasPorPerfil[perfil]]) {
          await page.goto(ruta);
          await esperarPantalla(page);
          for (const h of await medirContraste(page)) {
            hallazgos.push(`${ruta} ${h.selector} ${h.detalle}`);
          }
        }
        expect(hallazgos).toEqual([]);
      });
    }
  }

  for (const [perfil, { user }] of Object.entries(perfiles)) {
    test(`${perfil}: zonas táctiles de 44x44 px y sin scroll horizontal`, async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "Solo aplica a dispositivos táctiles");
      await loginViaUi(page, user);
      const rutas = [
        "/",
        "/mi-perfil",
        "/avisos",
        ...rutasPorPerfil[perfil as keyof typeof perfiles],
      ];
      const hallazgos: Hallazgo[] = [];
      for (const ruta of rutas) {
        await page.goto(ruta);
        await esperarPantalla(page);
        await expectNoHorizontalPageScroll(page);
        for (const h of await medirZonasTactiles(page)) {
          hallazgos.push({ selector: `${ruta} ${h.selector}`, detalle: h.detalle });
        }
      }
      await page.getByRole("button", { name: "Alternar menú lateral" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      for (const h of await medirZonasTactiles(page)) {
        hallazgos.push({ selector: `menú ${h.selector}`, detalle: h.detalle });
      }
      esperarSinHallazgos(hallazgos);
    });
  }
});

test.describe("Teclado", () => {
  test("el login se completa solo con teclado, con el foco visible y en el orden visual", async ({
    page,
  }) => {
    await page.goto("/login");
    const visitados: string[] = [];
    let ultimoY = -1;
    for (let paso = 0; paso < 12; paso++) {
      await page.keyboard.press("Tab");
      if (!(await focoVisible(page))) break;
      visitados.push(await foco(page));
      const y = await page.evaluate(() => document.activeElement?.getBoundingClientRect().top ?? 0);
      expect(y).toBeGreaterThanOrEqual(ultimoY - 1);
      ultimoY = y;
      if (await page.evaluate(() => document.activeElement?.matches("button[type=submit]"))) break;
    }
    await expect(page.locator("button[type=submit]")).toBeFocused();

    await page.locator("input[type=email]").focus();
    await page.keyboard.type(seededUsers.bedel.email);
    await page.keyboard.press("Tab");
    await page.keyboard.type(seededUsers.bedel.password);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/estado-institucional/);
  });

  test("el bedel recorre el menú con Tab y cada elemento enfocado muestra el foco", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "El menú móvil se prueba con la barra lateral");
    await loginViaUi(page, seededUsers.bedel);
    await page.getByRole("link", { name: "Estado institucional" }).first().focus();
    for (let paso = 0; paso < 12; paso++) {
      await page.keyboard.press("Tab");
      expect(await focoVisible(page), `paso ${paso}: ${await foco(page)}`).toBe(true);
    }
  });

  test("Escape cierra Publicar novedad y devuelve el foco al botón que lo abrió", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/novedades");
    const abrir = page.getByRole("button", { name: "Publicar novedad" });
    await abrir.focus();
    await page.keyboard.press("Enter");
    const dialogo = page.getByRole("dialog", { name: "Publicar novedad" });
    await expect(dialogo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(abrir).toBeFocused();
  });

  test("Escape cierra las Novedades de Configuración y devuelve el foco al botón", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.bedel);
    await page.goto("/configuracion");
    const abrir = page.getByRole("button", { name: "Novedades" });
    await abrir.focus();
    await page.keyboard.press("Enter");
    const dialogo = page.getByRole("dialog", { name: "Novedades" });
    await expect(dialogo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(abrir).toBeFocused();
  });

  test("Escape cierra la barra lateral móvil y devuelve el foco al botón del menú", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Solo aplica a la barra lateral móvil");
    await loginViaUi(page, seededUsers.bedel);
    const abrir = page.getByRole("button", { name: "Alternar menú lateral" });
    await abrir.focus();
    await page.keyboard.press("Enter");
    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(abrir).toBeFocused();
  });

  test("el menú de usuario se cierra con Escape y devuelve el foco", async ({ page, isMobile }) => {
    test.skip(isMobile, "En el celular el menú de usuario vive dentro de la barra lateral");
    await loginViaUi(page, seededUsers.bedel);
    const abrir = page.getByTestId("user-menu-trigger");
    await abrir.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Cerrar sesión" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: "Cerrar sesión" })).toBeHidden();
    await expect(abrir).toBeFocused();
  });
});

test.describe("360 px", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("login, 404, Mi perfil y los menús de Bedel y Administrador no scrollean a lo ancho", async ({
    page,
  }) => {
    await page.goto("/login");
    await expectNoHorizontalPageScroll(page);
    await page.goto("/ruta-que-no-existe");
    await expectNoHorizontalPageScroll(page);
    await loginViaUi(page, seededUsers.bedel);
    for (const ruta of ["/mi-perfil", "/configuracion", "/novedades", "/estado-institucional"]) {
      await page.goto(ruta);
      await esperarPantalla(page);
      await expectNoHorizontalPageScroll(page);
    }
  });
});
