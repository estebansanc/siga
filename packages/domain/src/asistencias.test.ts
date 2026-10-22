import { afterEach, describe, expect, it, vi } from "vitest";

import { esHoraFutura, registroManualSchema } from "./asistencias";

const valido = { claseId: "c1", docenteId: "d1", horaLlegada: "00:00", motivo: "Sin batería" };
const mensajes = (input: unknown) => {
  const resultado = registroManualSchema.safeParse(input);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
};

describe("registroManualSchema", () => {
  afterEach(() => vi.useRealTimers());

  it("acepta un registro completo y recorta el motivo", () => {
    expect(registroManualSchema.parse({ ...valido, motivo: "  Sin batería  " }).motivo).toBe(
      "Sin batería",
    );
  });

  it("exige el motivo", () => {
    expect(mensajes({ ...valido, motivo: "   " })).toEqual([
      "Ingresá el motivo del registro manual.",
    ]);
  });

  it("limita el motivo a 500 caracteres", () => {
    expect(registroManualSchema.safeParse({ ...valido, motivo: "a".repeat(500) }).success).toBe(
      true,
    );
    expect(mensajes({ ...valido, motivo: "a".repeat(501) })).toEqual([
      "El motivo puede tener hasta 500 caracteres.",
    ]);
  });

  it("exige clase y docente", () => {
    expect(mensajes({ ...valido, claseId: "", docenteId: "" })).toEqual([
      "Elegí la clase",
      "Elegí el docente",
    ]);
  });

  it("rechaza una hora de llegada posterior a la actual", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-26T22:30:00Z"));
    expect(mensajes({ ...valido, horaLlegada: "19:31" })).toContain(
      "La hora de llegada no puede ser posterior a la hora actual.",
    );
  });
});

describe("esHoraFutura", () => {
  const ahora = new Date("2026-10-26T22:30:00Z");

  it("compara con la hora argentina del instante", () => {
    expect(esHoraFutura("19:31", ahora)).toBe(true);
    expect(esHoraFutura("19:30", ahora)).toBe(false);
    expect(esHoraFutura("08:00", ahora)).toBe(false);
  });
});
