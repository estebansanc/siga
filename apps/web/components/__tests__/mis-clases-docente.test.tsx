import type { ClaseDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MisClasesDocente } from "@/components/clases/mis-clases-docente";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ clases: [] as ClaseDto[] }));
const reportar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-clases", () => ({
  useClases: () => ({ data: { fecha: "2026-10-14", clases: state.clases } }),
  useClase: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-aulas", () => ({ useAulas: () => ({ data: [] }) }));
vi.mock("@/hooks/use-incidencias", () => ({
  useReportarIncidencia: () => ({ mutateAsync: reportar, isPending: false }),
}));
vi.mock("@/components/novedades/publicar-novedad-dialog", () => ({
  PublicarNovedadDialog: () => null,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const clase: ClaseDto = {
  id: "clase-1",
  fecha: "2026-10-14",
  horaInicio: "19:00",
  horaFin: "23:00",
  inicio: "2026-10-14T22:00:00.000Z",
  fin: "2026-10-15T02:00:00.000Z",
  estado: "PROGRAMADA",
  modalidad: "PRESENCIAL",
  comision: { id: "c1", codigo: "5K2", turno: "NOCHE" },
  materia: { id: "m1", codigo: "K5-PF", nombre: "Proyecto Final", anioCarrera: 5, carreraId: "k" },
  carrera: { id: "k", codigo: "K", nombre: "ISI" },
  aula: { id: "a1", codigo: "Aula 12", edificio: "Edificio A", piso: "1.º piso" },
  docentes: [{ id: "d1", nombre: "Marcos Álvarez" }],
  asistencia: null,
  novedades: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  state.clases = [clase];
  reportar.mockResolvedValue({});
});

describe("MisClasesDocente", () => {
  it("reporta una incidencia desde una clase con aula, enviando la clase", async () => {
    renderWithProviders(<MisClasesDocente />);
    await userEvent.click(
      screen.getByRole("button", { name: "Reportar incidencia en Proyecto Final 5K2" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Nueva incidencia" });
    expect(within(dialog).getByText(/en Aula 12/)).toBeVisible();
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Elemento afectado"),
      "CLIMATIZACION",
    );
    await userEvent.type(within(dialog).getByLabelText("Descripción"), "El aire no enfría");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reportar" }));

    await waitFor(() => expect(reportar).toHaveBeenCalled());
    expect(reportar.mock.calls[0]?.[0]).toMatchObject({
      input: { aulaId: "a1", claseId: "clase-1", elemento: "CLIMATIZACION" },
    });
  });

  it("no ofrece reportar en una clase sin aula", () => {
    state.clases = [{ ...clase, aula: null }];
    renderWithProviders(<MisClasesDocente />);
    expect(screen.queryByRole("button", { name: /Reportar incidencia/ })).toBeNull();
  });
});
