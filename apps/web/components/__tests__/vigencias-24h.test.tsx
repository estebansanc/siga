import type { AvisoDto, EstadoInstitucionalDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AvisoItem } from "@/components/avisos/aviso-item";
import { EstadoActualCard } from "@/components/estado-institucional/estado-actual-card";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ estado: undefined as EstadoInstitucionalDto | undefined }));

vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: state.estado }),
}));

beforeEach(() => {
  state.estado = {
    estado: "ABIERTA_CON_NOVEDADES",
    motivo: "Prueba QA",
    desde: "2026-10-14T15:00:00.000Z",
    vigenciaHasta: "2026-10-15T00:30:00.000Z",
    usuario: null,
  } as EstadoInstitucionalDto;
});

describe("vigencias en 24 h", () => {
  it("la tarjeta del estado muestra la vigencia cargada como 21:30, igual que en el formulario", () => {
    renderWithProviders(<EstadoActualCard />);
    expect(screen.getByText(/vigencia estimada hasta 14\/10\/2026 21:30/)).toBeVisible();
  });

  it("el aviso publicado muestra desde 20:00 hasta 07:30 en 24 h", () => {
    const aviso = {
      id: "a1",
      titulo: "Prueba QA",
      cuerpo: "Prueba QA",
      prioridad: "NORMAL",
      destinatarios: { todos: true, perfiles: [], carreraIds: [], anios: [], comisionIds: [] },
      desde: "2026-10-14T23:00:00.000Z",
      hasta: "2026-10-15T10:30:00.000Z",
      enviarPorCorreo: false,
      publicadoPor: { id: "u1", nombre: "Bedel" },
      createdAt: "2026-10-14T22:00:00.000Z",
    } as AvisoDto;
    renderWithProviders(<AvisoItem aviso={aviso} />);
    expect(screen.getByText(/Vigente del 14\/10\/2026 20:00 al 15\/10\/2026 07:30/)).toBeVisible();
  });
});
