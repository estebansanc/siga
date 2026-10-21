import type { ClaseDto } from "@repo/api/client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EstadoClaseBadge, etiquetaEstadoClase } from "@/components/clases/estado-clase-badge";

const demora: ClaseDto["novedades"][number] = {
  id: "n1",
  tipo: "DEMORA",
  estado: "ACTIVA",
  minutosDemora: 15,
  enlaceVirtual: null,
  aulaNueva: null,
  mensaje: null,
  publicadaPorBedelia: false,
  createdAt: "2026-10-14T22:00:00.000Z",
};

describe("EstadoClaseBadge", () => {
  it("muestra texto, icono y color para cada estado", () => {
    render(<EstadoClaseBadge clase={{ estado: "DOCENTE_PRESENTE", novedades: [] }} />);
    const badge = screen.getByText("Docente presente");
    expect(badge).toHaveAttribute("data-estado", "DOCENTE_PRESENTE");
    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge.className).toContain("green");
  });

  it("una clase demorada dice los minutos de la novedad activa", () => {
    expect(etiquetaEstadoClase({ estado: "DEMORADA", novedades: [demora] })).toBe(
      "Demorada 15 min",
    );
    expect(etiquetaEstadoClase({ estado: "DEMORADA", novedades: [] })).toBe("Demorada");
    expect(etiquetaEstadoClase({ estado: "SUSPENDIDA", novedades: [demora] })).toBe("Suspendida");
  });
});
