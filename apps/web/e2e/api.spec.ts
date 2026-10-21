import { expect, newUser, test } from "./support/fixtures";

test.describe("API para clientes móviles", () => {
  test("login con bearer token y flujo completo sin cookies", async ({ playwright, baseURL }) => {
    const anonymous = await playwright.request.newContext({ baseURL });
    const signUpContext = await playwright.request.newContext({ baseURL });
    const user = newUser();
    const signUp = await signUpContext.post("/api/auth/sign-up/email", { data: user });
    expect(signUp.ok()).toBeTruthy();
    const token = signUp.headers()["set-auth-token"];
    expect(token).toBeTruthy();

    const api = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { authorization: `Bearer ${token}` },
    });

    expect((await anonymous.get("/api/v1/me")).status()).toBe(401);
    const me = await api.get("/api/v1/me");
    expect(me.status()).toBe(200);
    expect(await me.json()).toMatchObject({
      userEmail: user.email,
      role: "member",
      perfil: "ESTUDIANTE",
    });

    // Un estudiante consulta el estado y las clases, pero no administra la institución.
    const estado = await api.get("/api/v1/estado-institucional");
    expect(estado.status()).toBe(200);
    expect(await estado.json()).toMatchObject({ estado: expect.any(String) });
    const clases = await api.get("/api/v1/clases?ambito=todas");
    expect(clases.status()).toBe(200);
    expect(await clases.json()).toMatchObject({ clases: expect.any(Array) });
    expect((await api.patch("/api/v1/settings", { data: { name: "Otra" } })).status()).toBe(403);
    expect(
      (
        await api.post("/api/v1/estado-institucional", { data: { estado: "CERRADA", motivo: "x" } })
      ).status(),
    ).toBe(403);

    const spec = await anonymous.get("/api/v1/openapi.json");
    expect(spec.ok()).toBeTruthy();
    expect((await spec.json()).openapi).toBe("3.1.0");
  });
});
