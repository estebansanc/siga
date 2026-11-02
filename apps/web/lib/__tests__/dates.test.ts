import { describe, expect, it } from "vitest";

import {
  capitalizarPrimera,
  formatDate,
  formatDateTime,
  formatFechaCorta,
  formatFechaHora,
  formatFechaLarga,
  formatHora,
  isoArgentinoAInput,
  inputArgentinoAIso,
} from "../dates";

describe("fechas en es-AR", () => {
  it("formatea la fecha en español", () => {
    expect(formatDate(new Date(2026, 8, 10))).toBe("10 sep 2026");
    expect(formatDate("2026-09-10T00:00:00", "EEEE d 'de' MMMM")).toBe("jueves 10 de septiembre");
  });

  it("formatea fecha y hora en 24 horas", () => {
    expect(formatDateTime(new Date(2026, 8, 10, 14, 30))).toBe("10 sep 2026, 14:30");
  });

  it("muestra horas e instantes en hora argentina con el formato dd/mm/aaaa hh:mm", () => {
    expect(formatHora("2026-10-14T22:00:00.000Z")).toBe("19:00");
    expect(formatFechaHora("2026-10-15T02:30:00.000Z")).toBe("14/10/2026 23:30");
  });

  it("escribe una fecha de negocio larga y corta", () => {
    expect(formatFechaLarga("2026-10-14")).toBe("miércoles 14 de octubre");
    expect(formatFechaCorta("2026-10-14")).toBe("14/10/2026");
  });

  it("capitaliza solo la primera letra del encabezado", () => {
    expect(capitalizarPrimera(formatFechaLarga("2026-10-29"))).toBe("Jueves 29 de octubre");
    expect(capitalizarPrimera("")).toBe("");
  });

  it("convierte entre el valor del control y el instante en hora argentina", () => {
    expect(inputArgentinoAIso("2026-10-14T23:30")).toBe("2026-10-14T23:30:00-03:00");
    expect(isoArgentinoAInput("2026-10-14T23:30:00-03:00")).toBe("2026-10-14T23:30");
    expect(isoArgentinoAInput(undefined)).toBe("");
  });
});
