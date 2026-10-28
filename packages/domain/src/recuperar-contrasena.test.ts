import { describe, expect, it } from "vitest";

import { primerErrorContrasena } from "./contrasena";
import { definirContrasenaSchema } from "./recuperar-contrasena";

describe("primerErrorContrasena", () => {
  it("informa la primera regla incumplida: largo, letra, número", () => {
    expect(primerErrorContrasena("a1")).toBe("La contraseña debe tener al menos 8 caracteres.");
    expect(primerErrorContrasena("12345678")).toBe(
      "La contraseña debe incluir al menos una letra.",
    );
    expect(primerErrorContrasena("abcdefgh")).toBe(
      "La contraseña debe incluir al menos un número.",
    );
    expect(primerErrorContrasena("abcd1234")).toBeNull();
  });
});

describe("definirContrasenaSchema", () => {
  const issueOf = (contrasena: string, confirmacion: string) => {
    const result = definirContrasenaSchema.safeParse({ token: "t", contrasena, confirmacion });
    return result.success ? null : result.error.issues[0];
  };

  it("acepta una contraseña válida confirmada", () => {
    expect(issueOf("nueva1234", "nueva1234")).toBeNull();
  });

  it("marca la contraseña que incumple la política", () => {
    expect(issueOf("abcdefgh", "abcdefgh")).toMatchObject({
      path: ["contrasena"],
      message: "La contraseña debe incluir al menos un número.",
    });
  });

  it("marca la confirmación distinta", () => {
    expect(issueOf("nueva1234", "nueva12345")).toMatchObject({
      path: ["confirmacion"],
      message: "Las contraseñas no coinciden.",
    });
  });
});
