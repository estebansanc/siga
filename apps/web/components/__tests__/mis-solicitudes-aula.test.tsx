import type { SolicitudAulaDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MisSolicitudesAula } from "@/components/aulas/mis-solicitudes-aula";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ solicitudes: undefined as SolicitudAulaDto[] | undefined }));

vi.mock("@/hooks/use-solicitudes-aula", () => ({
  useMisSolicitudesAula: () => ({ data: state.solicitudes }),
}));
vi.mock("@/components/aulas/solicitar-aula-form", () => ({
  SolicitarAulaForm: ({ onSolicitada }: { onSolicitada: () => void }) => (
    <button onClick={onSolicitada}>Enviar formulario</button>
  ),
}));

const solicitud = (parcial: Partial<SolicitudAulaDto>): SolicitudAulaDto => ({
  id: "s1",
  estado: "PENDIENTE",
  alumnos: 40,
  recursos: ["Proyector", "Climatizacion"],
  comentario: null,
  motivoRechazo: null,
  createdAt: "2026-10-14T12:00:00.000Z",
  resueltaEn: null,
  solicitante: { id: "d1", nombre: "Marcos Álvarez" },
  aula: { id: "a7", codigo: "Aula 7", edificio: "Edificio B", piso: "PB" },
  clase: {
    id: "c1",
    aula: null,
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
  it("abre el formulario en un diálogo con Nueva solicitud y lo cierra al enviar", async () => {
    state.solicitudes = [];
    renderWithProviders(<MisSolicitudesAula />);
    expect(screen.getByText("Todavía no pediste ningún aula")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Nueva solicitud" }));
    expect(await screen.findByRole("dialog", { name: "Nueva solicitud" })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Enviar formulario" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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
