import { describe, expect, it } from "vitest";

import {
  estaBloqueada,
  estadoVigente,
  mensajeCuentaBloqueada,
  registrarIntentoFallido,
  sinBloqueo,
  type EstadoBloqueo,
} from "./bloqueo-cuenta";

const ahora = new Date("2026-10-28T15:00:00Z");

const fallar = (veces: number) => {
  let estado: EstadoBloqueo = sinBloqueo;
  for (let i = 0; i < veces; i += 1) estado = registrarIntentoFallido(estado, ahora);
  return estado;
};

describe("registrarIntentoFallido", () => {
  it("suma sin bloquear hasta el cuarto fallo", () => {
    expect(fallar(4)).toEqual({ intentosFallidos: 4, bloqueadoHasta: null });
  });

  it("bloquea 15 minutos en el quinto", () => {
    expect(fallar(5).bloqueadoHasta).toEqual(new Date("2026-10-28T15:15:00Z"));
  });
});

describe("estadoVigente", () => {
  it("conserva el bloqueo mientras dura", () => {
    const estado = fallar(5);
    expect(estaBloqueada(estado, new Date("2026-10-28T15:14:59Z"))).toBe(true);
    expect(estadoVigente(estado, new Date("2026-10-28T15:14:59Z"))).toBe(estado);
  });

  it("reinicia el contador al terminar el bloqueo", () => {
    expect(estadoVigente(fallar(5), new Date("2026-10-28T15:15:00Z"))).toEqual(sinBloqueo);
  });

  it("no toca los intentos de una cuenta sin bloqueo", () => {
    expect(estadoVigente(fallar(3), ahora).intentosFallidos).toBe(3);
  });
});

describe("mensajeCuentaBloqueada", () => {
  it("muestra la hora argentina en 24 horas", () => {
    expect(mensajeCuentaBloqueada(new Date("2026-10-28T21:05:00Z"))).toBe(
      "Cuenta bloqueada temporalmente. Podés volver a intentar a las 18:05.",
    );
  });
});
