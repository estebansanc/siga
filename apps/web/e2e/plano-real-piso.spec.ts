import type { Page } from "@playwright/test";

import { crearClaseDeHoyConAula, eliminarClaseConAula } from "./support/clase-de-hoy";
import {
  expect,
  expectNoHorizontalPageScroll,
  loginViaUi,
  seededUsers,
  test,
} from "./support/fixtures";

const imagenPlano =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='800'><rect width='1000' height='800' fill='#eee'/></svg>",
  );

const recinto = [
  { x: 0.1, y: 0.1 },
  { x: 0.4, y: 0.1 },
  { x: 0.4, y: 0.4 },
  { x: 0.1, y: 0.4 },
];

// El e2e corre sin almacenamiento: el plano de aulas no trae imagen, así que se le agrega a la
// respuesta real el plano y el polígono de una aula.
const ubicarAula = async (page: Page, aulaId: string) => {
  await page.route(/\/aulas\/plano(\?.*)?$/, async (route) => {
    const respuesta = await route.fetch();
    const aulas = (await respuesta.json()) as { id: string; edificio: string; piso: string }[];
    const piso = aulas.find((aula) => aula.id === aulaId)!;
    const conPlano = aulas.map((aula) =>
      aula.edificio === piso.edificio && aula.piso === piso.piso
        ? {
            ...aula,
            plano: { id: "plano-e2e", ancho: 1000, alto: 800, imagenUrl: imagenPlano },
            poligono: aula.id === aulaId ? recinto : null,
          }
        : aula,
    );
    await route.fulfill({ response: respuesta, json: conPlano });
  });
};

test.describe("Plano real del piso", () => {
  test.use({ serviceWorkers: "block" });

  test("el aula ubicada se dibuja en su recinto, la otra va en Sin ubicar y ambas abren su detalle; a 375 px no hay scroll horizontal", async ({
    page,
  }) => {
    const edificio = "Edificio C";
    const ubicada = await crearClaseDeHoyConAula();
    const sinUbicar = await crearClaseDeHoyConAula();
    try {
      await page.setViewportSize({ width: 375, height: 800 });
      await ubicarAula(page, ubicada.aulaId);
      await loginViaUi(page, seededUsers.bedel);
      await page.goto("/aulas?vista=plano");
      await page.getByRole("button", { name: edificio }).click();

      const enPlano = page.getByRole("button", { name: new RegExp(`^${ubicada.aulaCodigo},`) });
      await expect(enPlano).toBeVisible();
      await expect(page.getByRole("list", { name: "Estados de las aulas" })).toBeVisible();
      await expectNoHorizontalPageScroll(page);

      await enPlano.click();
      await expect(page.getByRole("dialog", { name: ubicada.aulaCodigo })).toBeVisible();
      await page.keyboard.press("Escape");

      const seccionSinUbicar = page.getByRole("region", { name: "Sin ubicar" });
      await seccionSinUbicar
        .getByRole("button", { name: new RegExp(sinUbicar.aulaCodigo) })
        .click();
      await expect(page.getByRole("dialog", { name: sinUbicar.aulaCodigo })).toBeVisible();
      await page.keyboard.press("Escape");

      const acercar = page.getByRole("button", { name: "Acercar" });
      for (let i = 0; i < 6; i++) await acercar.click();
      await expect(page.getByText("400 %")).toBeVisible();
      await expect(acercar).toBeDisabled();
      await expectNoHorizontalPageScroll(page);
      await page.getByRole("button", { name: "Restablecer" }).click();
      await expect(page.getByText("100 %")).toBeVisible();
    } finally {
      await eliminarClaseConAula(ubicada.claseId, ubicada.aulaId);
      await eliminarClaseConAula(sinUbicar.claseId, sinUbicar.aulaId);
    }
  });
});
