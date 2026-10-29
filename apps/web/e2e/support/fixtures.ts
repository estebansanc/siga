import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";

import { aceptarPolitica, enlaceDelUltimoCorreo, verificarCorreo } from "./db";

export type User = { name: string; email: string; password: string };

const uniqueSuffix = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Una cuenta nueva: se registra como estudiante de la institución (sin comisiones seguidas).
export const newUser = (): User => {
  const suffix = uniqueSuffix();
  return {
    name: `Usuario E2E ${suffix}`,
    email: `e2e-${suffix}@example.com`,
    password: "e2e-password-1",
  };
};

// Usuarios del seed (`packages/db/prisma/seed.ts`), uno por perfil.
export const seededUsers = {
  bedel: { name: "Rosa Benítez", email: "demo@example.com", password: "demo1234" },
  docente: { name: "Marcos Álvarez", email: "docente@example.com", password: "demo1234" },
  estudiante: { name: "Lucía Gómez", email: "estudiante@example.com", password: "demo1234" },
  autoridad: { name: "Carla Medina", email: "autoridad@example.com", password: "demo1234" },
} satisfies Record<string, User>;

export const apiRetries = 3;

export const signUpViaApi = async (request: APIRequestContext, user: User) => {
  const response = await request.post("/api/auth/sign-up/email", {
    data: user,
    maxRetries: apiRetries,
  });
  expect(response.ok()).toBeTruthy();
  verificarCorreo(user.email);
  aceptarPolitica(user.email);
};

// El registro por la pantalla termina en "Revisá tu correo"; el enlace del correo verifica la
// cuenta y la deja adentro.
export const registerViaUi = async (page: Page, user: User) => {
  await page.goto("/registro");
  await page.getByLabel("Nombre y apellido").fill(user.name);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Revisá tu correo")).toBeVisible();
};

export const aceptarPoliticaViaUi = async (page: Page) => {
  await expect(page).toHaveURL(/\/politica-de-privacidad/);
  await page.getByRole("button", { name: "Aceptar y continuar" }).click();
  await expect(page).not.toHaveURL(/\/politica-de-privacidad/);
};

// Una cuenta nueva ve la política antes que cualquier pantalla: el enlace la verifica y la
// acepta por la pantalla.
export const verifyEmailViaLink = async (page: Page, user: User) => {
  await page.goto(enlaceDelUltimoCorreo(user.email));
  await aceptarPoliticaViaUi(page);
  await expect(page).toHaveURL(/\/$/);
};

export type Me = {
  userId: string;
  organizationId: string;
  perfil: string;
  organizations: { id: string; name: string; slug: string; role: string }[];
};

export const readMeViaApi = async (request: APIRequestContext) => {
  const response = await request.get("/api/v1/me", { maxRetries: apiRetries });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Me;
};

const firstCompileTimeout = 60_000;

export const loginViaUi = async (page: Page, user: User) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: firstCompileTimeout });
};

export const logoutViaUi = async (page: Page) => {
  await page.getByTestId("user-menu-trigger").click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
};

export const expectNoHorizontalPageScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);
};

type Fixtures = {
  user: User;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  user: async ({ request }, use) => {
    const user = newUser();
    await signUpViaApi(request, user);
    await use(user);
  },
  authenticatedPage: async ({ page, user }, use) => {
    await loginViaUi(page, user);
    await use(page);
  },
});

export { expect };
