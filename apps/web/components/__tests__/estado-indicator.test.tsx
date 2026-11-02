import type { EstadoInstitucionalDto } from "@repo/api/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EstadoIndicator } from "@/components/estado-institucional/estado-indicator";

const state = vi.hoisted(() => ({
  estado: undefined as EstadoInstitucionalDto | undefined,
  ahora: 0,
}));

vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: state.estado, dataUpdatedAt: state.ahora }),
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
  state.ahora = Date.parse("2026-10-14T18:00:00.000Z");
});

describe("EstadoIndicator", () => {
  it("muestra un esqueleto mientras carga", () => {
    state.estado = undefined;
    render(<EstadoIndicator />);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("muestra el estado con color, icono, texto y desde cuándo rige en hora argentina, con link al detalle", () => {
    render(<EstadoIndicator />);
    const link = screen.getByRole("link", { name: "Institución abierta, desde las 07:30" });
    expect(link).toHaveAttribute("href", "/estado-institucional");
    expect(screen.getByText("Institución abierta")).toHaveAttribute("data-estado", "ABIERTA");
    expect(link.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Desde las 07:30")).toBeInTheDocument();
    expect(screen.queryByText(/Actualizado/)).not.toBeInTheDocument();
  });

  it("dice ayer y la fecha completa cuando el estado no se registró hoy", () => {
    state.estado = { ...abierta, desde: "2026-10-13T20:20:00.000Z" };
    const { unmount } = render(<EstadoIndicator />);
    expect(screen.getByText("Desde ayer 17:20")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Institución abierta, desde ayer 17:20" }),
    ).toBeVisible();
    unmount();
    state.estado = { ...abierta, desde: "2026-10-12T20:20:00.000Z" };
    render(<EstadoIndicator />);
    expect(screen.getByText("Desde el 12/10/2026 17:20")).toBeInTheDocument();
  });

  it("muestra la hora del nuevo registro cuando el refresco trae un cambio de estado", () => {
    const { rerender } = render(<EstadoIndicator />);
    expect(screen.getByText("Desde las 07:30")).toBeInTheDocument();
    state.estado = {
      ...abierta,
      id: "e2",
      estado: "CERRADA",
      motivo: "Paro",
      desde: "2026-10-14T17:45:00.000Z",
    };
    state.ahora = Date.parse("2026-10-14T17:46:00.000Z");
    rerender(<EstadoIndicator />);
    expect(screen.getByText("Desde las 14:45")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Institución cerrada, Paro, desde las 14:45" }),
    ).toBeVisible();
  });

  it("el motivo cede espacio antes que 'Desde …', que nunca se recorta", () => {
    state.estado = { ...abierta, estado: "CERRADA", motivo: "Corte de energía" };
    render(<EstadoIndicator />);
    expect(screen.getByText("Corte de energía").className).toContain("shrink-[999]");
    expect(screen.getByText("Desde las 07:30").className).toContain("shrink-0");
    expect(screen.getByText("Desde las 07:30").className).not.toContain("truncate");
  });

  it("pasa de hoy a ayer al refrescar después de la medianoche argentina", () => {
    const { rerender } = render(<EstadoIndicator />);
    expect(screen.getByText("Desde las 07:30")).toBeInTheDocument();
    state.ahora = Date.parse("2026-10-15T03:30:00.000Z");
    rerender(<EstadoIndicator />);
    expect(screen.getByText("Desde ayer 07:30")).toBeInTheDocument();
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
        name: "Institución cerrada, Corte de energía, desde las 07:30",
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
      screen.getByRole("link", { name: "Institución abierta, desde las 07:30" }),
    ).toBeVisible();
  });
});
