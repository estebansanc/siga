import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/sesion-vencida/route";

const call = (query = "") =>
  GET(new NextRequest(`http://localhost:3000/api/sesion-vencida${query}`));

describe("GET /api/sesion-vencida", () => {
  it("lleva al login con la ruta pedida y borra las cookies de sesión", () => {
    const response = call("?next=%2Fclases");

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fclases");
    const cleared = response.cookies.getAll().map(({ name, value }) => [name, value]);
    expect(cleared).toContainEqual(["better-auth.session_token", ""]);
    expect(cleared).toContainEqual(["__Secure-better-auth.session_token", ""]);
  });

  it("sin ruta pedida va al login a secas", () => {
    expect(call().headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("no sigue un destino externo", () => {
    expect(call("?next=https%3A%2F%2Fmal.example").headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });
});
