import { describe, expect, it } from "vitest";

import {
  avisoDesdeEstado,
  avisoDesdeQuery,
  ofreceAviso,
  queryDeAvisoDesdeEstado,
} from "@/lib/aviso-precargado";

describe("avisoDesdeEstado", () => {
  it("Cerrada genera un aviso urgente con el motivo y la vigencia en hora argentina", () => {
    expect(
      avisoDesdeEstado({
        estado: "CERRADA",
        motivo: "Corte de energía",
        vigenciaHasta: "2026-10-15T01:30:00.000Z",
      }),
    ).toEqual({
      titulo: "Institución cerrada",
      cuerpo: "Corte de energía",
      prioridad: "URGENTE",
      hasta: "2026-10-14T22:30",
    });
  });

  it("Abierta con novedades sin vigencia deja 'hasta' vacío", () => {
    expect(
      avisoDesdeEstado({ estado: "ABIERTA_CON_NOVEDADES", motivo: "Paro", vigenciaHasta: null }),
    ).toEqual({
      titulo: "Institución abierta con novedades",
      cuerpo: "Paro",
      prioridad: "URGENTE",
      hasta: "",
    });
  });
});

describe("ofreceAviso", () => {
  it("solo Cerrada y Abierta con novedades", () => {
    expect(
      ["ABIERTA", "CERRADA", "ABIERTA_CON_NOVEDADES"].filter((e) => ofreceAviso(e as never)),
    ).toEqual(["CERRADA", "ABIERTA_CON_NOVEDADES"]);
  });
});

describe("avisoDesdeQuery", () => {
  it("recupera el aviso que arma la query del cambio de estado", () => {
    const cambio = {
      estado: "CERRADA" as const,
      motivo: "Corte",
      vigenciaHasta: "2026-10-15T01:30:00.000Z",
    };
    const params = new URLSearchParams(queryDeAvisoDesdeEstado(cambio));
    expect(avisoDesdeQuery(params)).toEqual(avisoDesdeEstado(cambio));
  });

  it("sin estado o con un estado que no ofrece aviso no precarga nada", () => {
    expect(avisoDesdeQuery(new URLSearchParams())).toBeNull();
    expect(avisoDesdeQuery(new URLSearchParams("estado=ABIERTA"))).toBeNull();
    expect(avisoDesdeQuery(new URLSearchParams("estado=cualquier-cosa"))).toBeNull();
  });
});
