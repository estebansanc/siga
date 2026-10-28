import { describe, expect, it } from "vitest";

import {
  actualizarUsuarioSchema,
  contrasenaSchema,
  correoEnDominiosPermitidos,
  crearUsuarioSchema,
  edicionUsuarioFormSchema,
  dominiosPermitidosSchema,
  estadoDeUsuario,
  mensajeDominiosRechazados,
} from "./usuarios";

const valido = {
  nombre: "Pérez, Ana",
  dni: "30123456",
  correo: " Ana@FRT.utn.edu.ar ",
  perfil: "DOCENTE",
};

describe("crearUsuarioSchema", () => {
  it("normaliza el correo y completa las comisiones", () => {
    const usuario = crearUsuarioSchema.parse(valido);
    expect(usuario.correo).toBe("ana@frt.utn.edu.ar");
    expect(usuario.comisionIds).toEqual([]);
  });

  it.each(["123456", "123456789", "12.345.678", "abcdefgh"])("rechaza el DNI %s", (dni) => {
    expect(crearUsuarioSchema.safeParse({ ...valido, dni }).success).toBe(false);
  });

  it("acepta DNI de 7 y de 8 dígitos", () => {
    expect(crearUsuarioSchema.safeParse({ ...valido, dni: "9876543" }).success).toBe(true);
    expect(crearUsuarioSchema.safeParse({ ...valido, dni: "30123456" }).success).toBe(true);
  });

  it("rechaza un correo inválido", () => {
    expect(crearUsuarioSchema.safeParse({ ...valido, correo: "ana@" }).success).toBe(false);
  });

  it("deja el legajo vacío como nulo", () => {
    expect(crearUsuarioSchema.parse({ ...valido, legajo: "  " }).legajo).toBeNull();
  });
});

describe("actualizarUsuarioSchema", () => {
  it("no admite cambiar el correo", () => {
    expect(actualizarUsuarioSchema.parse({ correo: "otro@x.com" })).toEqual({});
  });
});

describe("contrasenaSchema", () => {
  it("pide 8 caracteres con letras y números", () => {
    expect(contrasenaSchema.safeParse("abcd1234").success).toBe(true);
    expect(contrasenaSchema.safeParse("abc123").success).toBe(false);
    expect(contrasenaSchema.safeParse("abcdefgh").success).toBe(false);
    expect(contrasenaSchema.safeParse("12345678").success).toBe(false);
  });
});

describe("dominios permitidos", () => {
  it("normaliza, quita la arroba y repetidos", () => {
    const { dominios } = dominiosPermitidosSchema.parse({
      dominios: ["@FRT.utn.edu.ar", "frt.utn.edu.ar"],
    });
    expect(dominios).toEqual(["frt.utn.edu.ar"]);
  });

  it("rechaza algo que no es un dominio", () => {
    expect(dominiosPermitidosSchema.safeParse({ dominios: ["frt"] }).success).toBe(false);
  });

  it("sin dominios acepta cualquier correo", () => {
    expect(correoEnDominiosPermitidos("a@gmail.com", [])).toBe(true);
  });

  it("con dominios exige uno de ellos", () => {
    expect(correoEnDominiosPermitidos("a@frt.utn.edu.ar", ["frt.utn.edu.ar"])).toBe(true);
    expect(correoEnDominiosPermitidos("a@gmail.com", ["frt.utn.edu.ar"])).toBe(false);
    expect(mensajeDominiosRechazados(["a.com", "b.com"])).toBe(
      "Solo se aceptan correos de a.com, b.com",
    );
  });
});

describe("estadoDeUsuario", () => {
  it("prioriza la desactivación y luego la verificación", () => {
    expect(estadoDeUsuario({ activo: false, correoVerificado: true })).toBe("DESACTIVADO");
    expect(estadoDeUsuario({ activo: true, correoVerificado: false })).toBe("PENDIENTE");
    expect(estadoDeUsuario({ activo: true, correoVerificado: true })).toBe("ACTIVO");
  });
});

describe("edicionUsuarioFormSchema", () => {
  const edicion = { ...valido, correo: "ana@frt.utn.edu.ar" };

  it("acepta el DNI vacío y valida el que se escribe", () => {
    expect(edicionUsuarioFormSchema.safeParse({ ...edicion, dni: "" }).success).toBe(true);
    expect(edicionUsuarioFormSchema.safeParse({ ...edicion, dni: "123" }).success).toBe(false);
  });
});
