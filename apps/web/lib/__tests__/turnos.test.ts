import { describe, expect, it } from "vitest";

import { describirRango, describirTurno } from "../turnos";

describe("turnos", () => {
  it("escribe el rango en 24 horas con cero inicial", () => {
    expect(describirRango({ inicio: "07:00", fin: "13:00" })).toBe("07:00 – 13:00");
  });

  it("antepone el nombre del turno", () => {
    expect(describirTurno("TARDE", { inicio: "13:00", fin: "18:30" })).toBe("Tarde 13:00 – 18:30");
  });
});
