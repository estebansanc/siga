import { describe, expect, it } from "vitest";

import { planearFechasDeClases } from "../e2e/support/fechas-de-clases";

// 2026-11-05 es jueves: el período va del 06/11 al 05/12 y los lunes son 9, 16, 23 y 30/11.
const hoy = "2026-11-05";

describe("planearFechasDeClases", () => {
  it("sin días cargados reserva la primera fecha y genera las demás", () => {
    expect(planearFechasDeClases(hoy, [])).toEqual({
      inicio: "2026-11-06",
      fin: "2026-12-05",
      diaSemana: 1,
      diaNoLaborable: "2026-11-09",
      claseGenerada: "2026-11-16",
      clasesEsperadas: 3,
    });
  });

  it("descuenta un feriado cargado que cae en el día del horario", () => {
    const plan = planearFechasDeClases(hoy, [{ fecha: "2026-11-23", activo: true }]);
    expect(plan.diaNoLaborable).toBe("2026-11-09");
    expect(plan.clasesEsperadas).toBe(2);
  });

  it("no reutiliza como día no laborable ni como clase una fecha ya cargada", () => {
    const plan = planearFechasDeClases(hoy, [{ fecha: "2026-11-09", activo: true }]);
    expect(plan.diaNoLaborable).toBe("2026-11-16");
    expect(plan.claseGenerada).toBe("2026-11-23");
    expect(plan.clasesEsperadas).toBe(2);
  });

  it("un día dado de baja no descuenta clases pero no se puede volver a cargar", () => {
    const plan = planearFechasDeClases(hoy, [{ fecha: "2026-11-09", activo: false }]);
    expect(plan.diaNoLaborable).toBe("2026-11-16");
    expect(plan.claseGenerada).toBe("2026-11-09");
    expect(plan.clasesEsperadas).toBe(3);
  });

  it("pasa a otro día de la semana si el primero no tiene fechas libres", () => {
    const lunes = ["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"];
    const plan = planearFechasDeClases(
      hoy,
      lunes.map((fecha) => ({ fecha, activo: true })),
    );
    expect(plan.diaSemana).toBe(2);
  });

  it("falla si ningún día de la semana tiene fechas libres", () => {
    const todas = Array.from({ length: 30 }, (_, i) => ({
      fecha: new Date(Date.UTC(2026, 10, 6 + i, 12)).toISOString().slice(0, 10),
      activo: true,
    }));
    expect(() => planearFechasDeClases(hoy, todas)).toThrow();
  });
});
