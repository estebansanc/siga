import type { SolicitudAulaDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MisSolicitudesAula } from "@/components/aulas/mis-solicitudes-aula";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ solicitudes: undefined as SolicitudAulaDto[] | undefined }));

vi.mock("@/hooks/use-solicitudes-aula", () => ({
  useMisSolicitudesAula: () => ({ data: state.solicitudes }),
}));

const solicitud = (parcial: Partial<SolicitudAulaDto>): SolicitudAulaDto => ({
  id: "s1",
  estado: "PENDIENTE",
  alumnos: 40,
  recursos: ["Proyector", "Climatizacion"],
  comentario: null,
  motivoRechazo: null,
  createdAt: "2026-10-14T12:00:00.000Z",
  aula: { id: "a7", codigo: "Aula 7", edificio: "Edificio B", piso: "PB" },
  clase: {
    id: "c1",
    fecha: "2026-10-15",
    horaInicio: "19:00",
    horaFin: "23:00",
    materia: "Proyecto Final",
    comision: "5K2",
  },
  ...parcial,
});

beforeEach(() => {
  state.solicitudes = undefined;
});

describe("MisSolicitudesAula", () => {
  it("lleva a Solicitar aula", () => {
    state.solicitudes = [];
    renderWithProviders(<MisSolicitudesAula />);
    expect(screen.getByRole("link", { name: "Solicitar aula" })).toHaveAttribute(
      "href",
      "/aulas/solicitar",
    );
    expect(screen.getByText("Todavía no pediste ningún aula")).toBeVisible();
  });

  it("muestra clase, franja, aula, alumnos, recursos y estado", () => {
    state.solicitudes = [solicitud({})];
    renderWithProviders(<MisSolicitudesAula />);
    expect(screen.getByText(/Proyecto Final · 5K2/)).toBeVisible();
    expect(screen.getByText("Pendiente")).toBeVisible();
    expect(screen.getByText(/15\/10\/2026 · 19:00 – 23:00 · Aula 7/)).toBeVisible();
    expect(screen.getByText("40 alumnos · Proyector, Climatización")).toBeVisible();
  });

  it("muestra el motivo de una solicitud rechazada", () => {
    state.solicitudes = [
      solicitud({ estado: "RECHAZADA", motivoRechazo: "Mantenimiento programado" }),
    ];
    renderWithProviders(<MisSolicitudesAula />);
    expect(screen.getByText("Rechazada")).toBeVisible();
    expect(screen.getByText("Motivo del rechazo: Mantenimiento programado")).toBeVisible();
  });
});
