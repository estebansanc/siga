import { describe, expect, it } from "vitest";

import {
  diaSemanaDe,
  fechaArgentina,
  fechasEntre,
  horaArgentina,
  horaSchema,
  instanteArgentino,
  rangoDelDia,
  sumarDias,
} from "./tiempo";

describe("tiempo argentino", () => {
  it("convierte fecha y hora locales a un instante UTC−3", () => {
    expect(instanteArgentino("2026-10-14", "19:00").toISOString()).toBe("2026-10-14T22:00:00.000Z");
    expect(instanteArgentino("2026-10-14", "23:30").toISOString()).toBe("2026-10-15T02:30:00.000Z");
  });

  it("vuelve de un instante a la fecha y hora argentinas, también pasada la medianoche UTC", () => {
    const instante = new Date("2026-10-15T02:30:00.000Z");
    expect(fechaArgentina(instante)).toBe("2026-10-14");
    expect(horaArgentina(instante)).toBe("23:30");
  });

  it("delimita el día completo en hora argentina", () => {
    const { desde, hasta } = rangoDelDia("2026-10-14");
    expect(desde.toISOString()).toBe("2026-10-14T03:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-10-15T03:00:00.000Z");
  });

  it("numera los días de la semana de lunes (1) a domingo (7)", () => {
    expect(diaSemanaDe("2026-10-12")).toBe(1);
    expect(diaSemanaDe("2026-10-18")).toBe(7);
  });

  it("suma días y enumera fechas con ambos extremos incluidos", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
    expect(fechasEntre("2026-10-30", "2026-11-01")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(fechasEntre("2026-11-02", "2026-11-01")).toEqual([]);
  });

  it("valida horas HH:mm", () => {
    expect(horaSchema.safeParse("07:00").success).toBe(true);
    expect(horaSchema.safeParse("24:00").success).toBe(false);
    expect(horaSchema.safeParse("7:00").success).toBe(false);
  });
});
