import type { EstadoInstitucionalDto } from "@repo/api/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstadoIndicator } from "@/components/estado-institucional/estado-indicator";

const state = vi.hoisted(() => ({ estado: undefined as EstadoInstitucionalDto | undefined }));

vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: state.estado }),
}));

const abierta: EstadoInstitucionalDto = {
  id: "e1",
  estado: "ABIERTA",
  motivo: null,
  desde: "2026-10-14T10:30:00.000Z",
  vigenciaHasta: null,
  usuario: { id: "u1", nombre: "Rosa Benítez" },
};

beforeEach(() => {
  state.estado = abierta;
});

describe("EstadoIndicator", () => {
  it("muestra un esqueleto mientras carga", () => {
    state.estado = undefined;
    render(<EstadoIndicator />);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("muestra el estado con color, icono, texto y la hora argentina de actualización, con link al detalle", () => {
    render(<EstadoIndicator />);
    const link = screen.getByRole("link", { name: "Institución abierta, actualizado 07:30" });
    expect(link).toHaveAttribute("href", "/estado-institucional");
    expect(screen.getByText("Institución abierta")).toHaveAttribute("data-estado", "ABIERTA");
    expect(link.querySelector("svg")).toBeInTheDocument();
  });

  it("distingue cerrada y abierta con novedades", () => {
    state.estado = { ...abierta, estado: "CERRADA", motivo: "Paro" };
    const { unmount } = render(<EstadoIndicator />);
    expect(screen.getByText("Institución cerrada").className).toContain("red");
    unmount();
    state.estado = { ...abierta, estado: "ABIERTA_CON_NOVEDADES" };
    render(<EstadoIndicator />);
    expect(screen.getByText("Abierta con novedades").className).toContain("yellow");
  });

  it("cerrada suma el motivo junto al badge y lo incluye en el nombre accesible", () => {
    state.estado = { ...abierta, estado: "CERRADA", motivo: "Corte de energía" };
    render(<EstadoIndicator />);
    expect(screen.getByText("Corte de energía")).toBeInTheDocument();
    expect(screen.getByText("Corte de energía").className).toContain("truncate");
    expect(
      screen.getByRole("link", {
        name: "Institución cerrada, Corte de energía, actualizado 07:30",
      }),
    ).toHaveAttribute("href", "/estado-institucional");
  });

  it("abierta con novedades suma el motivo en amarillo", () => {
    state.estado = { ...abierta, estado: "ABIERTA_CON_NOVEDADES", motivo: "Sin ascensor" };
    render(<EstadoIndicator />);
    expect(screen.getByText("Sin ascensor")).toBeInTheDocument();
    expect(screen.getByText("Abierta con novedades").className).toContain("yellow");
  });

  it("abierta no muestra motivo", () => {
    state.estado = { ...abierta, motivo: "Resto de un motivo anterior" };
    render(<EstadoIndicator />);
    expect(screen.queryByText("Resto de un motivo anterior")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Institución abierta, actualizado 07:30" }),
    ).toBeVisible();
  });
});
