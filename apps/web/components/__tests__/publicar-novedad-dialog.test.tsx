import type { AulaDto, ClaseDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicarNovedadDialog } from "@/components/novedades/publicar-novedad-dialog";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  clases: [] as ClaseDto[],
  aulas: [] as AulaDto[],
}));
const publicar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-clases", () => ({
  useClases: () => ({ data: { fecha: "2026-10-14", clases: state.clases } }),
}));
vi.mock("@/hooks/use-novedades", () => ({
  usePublicarNovedad: () => ({ mutateAsync: publicar, isPending: false }),
  useAulasDisponibles: (claseIds: string[]) => ({
    data: claseIds.length ? state.aulas : undefined,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const claseBase: ClaseDto = {
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
  docentes: [],
  novedades: [],
};

const finalizada: ClaseDto = {
  ...claseBase,
  id: "clase-2",
  estado: "FINALIZADA",
  horaInicio: "08:00",
};

const render = (claseInicial?: ClaseDto) =>
  renderWithProviders(
    <PublicarNovedadDialog open onOpenChange={() => {}} claseInicial={claseInicial} />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.clases = [claseBase, finalizada];
  state.aulas = [
    {
      id: "a2",
      codigo: "Aula 7",
      edificio: "Edificio B",
      piso: "PB",
      capacidad: 45,
      equipamiento: [],
    },
  ];
  publicar.mockResolvedValue({});
});

describe("PublicarNovedadDialog", () => {
  it("exige elegir una clase; las finalizadas no se pueden seleccionar", async () => {
    render();
    const dialog = screen.getByRole("dialog", { name: "Publicar novedad" });
    expect(within(dialog).getByRole("checkbox", { name: /08:00/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
    expect(await within(dialog).findByText("Elegí al menos una clase")).toBeVisible();
    expect(publicar).not.toHaveBeenCalled();
  });

  it("Demora pide los minutos junto al campo y publica con mensaje, contando caracteres", async () => {
    render(claseBase);
    const dialog = screen.getByRole("dialog", { name: "Publicar novedad" });
    expect(within(dialog).getByText("Proyecto Final · 5K2 · 14/10/2026 19:00")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
    expect(await within(dialog).findByText("Indicá los minutos de demora")).toBeVisible();

    await userEvent.type(within(dialog).getByLabelText("Minutos estimados de demora"), "15");
    await userEvent.type(
      within(dialog).getByLabelText(/Mensaje para los estudiantes/),
      "Arranco 19:15",
    );
    expect(within(dialog).getByText("13 / 500")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
    await waitFor(() =>
      expect(publicar).toHaveBeenCalledWith({
        claseIds: ["clase-1"],
        tipo: "DEMORA",
        minutosDemora: 15,
        mensaje: "Arranco 19:15",
      }),
    );
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Novedad publicada");
  });

  it("cada tipo muestra solo su dato obligatorio: enlace para Virtual, aula disponible para Cambio de aula", async () => {
    render(claseBase);
    const dialog = screen.getByRole("dialog", { name: "Publicar novedad" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Virtual" }));
    expect(within(dialog).getByLabelText("Enlace de la clase virtual")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Minutos estimados de demora")).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
    expect(await within(dialog).findByText("Ingresá el enlace de la clase virtual")).toBeVisible();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cambio de aula" }));
    const aula = within(dialog).getByLabelText("Aula nueva");
    expect(within(aula).getByRole("option", { name: /Aula 7/ })).toBeInTheDocument();
    await userEvent.selectOptions(aula, "a2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
    await waitFor(() =>
      expect(publicar).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: "CAMBIO_AULA", aulaNuevaId: "a2", claseIds: ["clase-1"] }),
      ),
    );
  });

  it("Ausencia no pide datos extra y se puede quitar la clase elegida", async () => {
    render(claseBase);
    const dialog = screen.getByRole("dialog", { name: "Publicar novedad" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Ausencia" }));
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "Quitar Proyecto Final · 5K2 · 14/10/2026 19:00",
      }),
    );
    await userEvent.click(within(dialog).getByRole("checkbox", { name: /19:00/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));
    await waitFor(() =>
      expect(publicar).toHaveBeenCalledWith({
        claseIds: ["clase-1"],
        tipo: "AUSENCIA",
        mensaje: null,
      }),
    );
  });
});
