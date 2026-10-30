import { expect, loginViaUi, seededUsers, test } from "./support/fixtures";

const fechaArgentinaDeHoy = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(),
  );

const proximoDomingo = () => {
  const fecha = new Date(`${fechaArgentinaDeHoy()}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + ((7 - fecha.getUTCDay()) % 7 || 7));
  return fecha.toISOString().slice(0, 10);
};

test.describe("Clases", () => {
  test("la Autoridad arranca en Clases, con título, hoy precargado y estado vacío", async ({
    page,
  }) => {
    await loginViaUi(page, seededUsers.autoridad);
    await expect(page).toHaveURL(/\/clases$/);
    await expect(page).toHaveTitle(/^Clases/);
    await expect(page.getByRole("heading", { name: "Clases", exact: true })).toBeVisible();
    await expect(page.getByLabel("Fecha")).toHaveValue(fechaArgentinaDeHoy());

    await page.getByLabel("Fecha").fill(proximoDomingo());
    await expect(page.getByText("No se encontraron clases")).toBeVisible();
  });
});
