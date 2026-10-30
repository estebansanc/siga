import { describe, expect, it } from "vitest";

import { generarQrSchema, rangoDeTurno, turnoActual, turnosIniciales, turnosSchema } from "./turnos";

describe("turnosSchema", () => {
  it("acepta los turnos iniciales", () => {
    expect(turnosSchema.safeParse(turnosIniciales).success).toBe(true);
  });

  it("rechaza un fin anterior o igual al inicio", () => {
    const result = turnosSchema.safeParse({
      ...turnosIniciales,
      NOCHE: { inicio: "18:00", fin: "18:00" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un turno que empieza antes de que termine el anterior", () => {
    const result = turnosSchema.safeParse({
      ...turnosIniciales,
      TARDE: { inicio: "12:00", fin: "18:00" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza horas con formato inválido", () => {
    expect(
      turnosSchema.safeParse({ ...turnosIniciales, MANANA: { inicio: "7:00", fin: "13:00" } })
        .success,
    ).toBe(false);
  });
});

describe("rangoDeTurno", () => {
  it("devuelve los instantes en hora argentina", () => {
    const { desde, hasta } = rangoDeTurno(turnosIniciales, "NOCHE", "2026-10-26");
    expect(desde.toISOString()).toBe("2026-10-26T21:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-10-27T02:30:00.000Z");
  });
});

describe("generarQrSchema", () => {
  it("exige aula, turno y fecha válidos", () => {
    expect(
      generarQrSchema.safeParse({ aulaId: "a", turno: "NOCHE", fecha: "2026-10-26" }).success,
    ).toBe(true);
    expect(
      generarQrSchema.safeParse({ aulaId: "", turno: "NOCHE", fecha: "2026-10-26" }).success,
    ).toBe(false);
    expect(
      generarQrSchema.safeParse({ aulaId: "a", turno: "MADRUGADA", fecha: "2026-10-26" }).success,
    ).toBe(false);
    expect(
      generarQrSchema.safeParse({ aulaId: "a", turno: "NOCHE", fecha: "26/10/2026" }).success,
    ).toBe(false);
  });
});

describe("turnoActual", () => {
  it("devuelve la franja que contiene la hora", () => {
    expect(turnoActual(turnosIniciales, "10:00")).toBe("MANANA");
    expect(turnoActual(turnosIniciales, "15:30")).toBe("TARDE");
    expect(turnoActual(turnosIniciales, "20:00")).toBe("NOCHE");
  });

  it("incluye el inicio y excluye el fin", () => {
    expect(turnoActual(turnosIniciales, "13:00")).toBe("TARDE");
    expect(turnoActual(turnosIniciales, "12:59")).toBe("MANANA");
    expect(turnoActual(turnosIniciales, "18:00")).toBe("NOCHE");
  });

  it("antes del primer turno devuelve el primero", () => {
    expect(turnoActual(turnosIniciales, "05:00")).toBe("MANANA");
  });

  it("en un hueco devuelve el siguiente", () => {
    const conHuecos = {
      MANANA: { inicio: "07:00", fin: "12:00" },
      TARDE: { inicio: "14:00", fin: "18:00" },
      NOCHE: { inicio: "19:00", fin: "23:00" },
    };
    expect(turnoActual(conHuecos, "13:00")).toBe("TARDE");
    expect(turnoActual(conHuecos, "18:30")).toBe("NOCHE");
  });

  it("después del último turno devuelve el último", () => {
    expect(turnoActual(turnosIniciales, "23:45")).toBe("NOCHE");
  });
});
