import type { Page } from "@playwright/test";

import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const backdropFilters = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="dialog-overlay"]')].map(
      (el) => getComputedStyle(el).backdropFilter,
    ),
  );

test.describe("Fondo de los pop-ups", () => {
  test("todo pop-up desenfoca el fondo", async ({ page }) => {
    await loginViaUi(page, seededUsers.docente);
    await page.goto("/novedades");
    await page.getByRole("button", { name: "Publicar novedad" }).click();
    await expect(page.getByRole("dialog", { name: "Publicar novedad" })).toBeVisible();
    expect(await backdropFilters(page)).toEqual([expect.stringContaining("blur")]);
  });
});
