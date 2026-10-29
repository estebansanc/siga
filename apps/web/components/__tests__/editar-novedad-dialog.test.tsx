import type { NovedadDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditarNovedadDialog } from "@/components/novedades/editar-novedad-dialog";
import { renderWithProviders } from "@/test/render";

const editar = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-novedades", () => ({
  useEditarNovedad: () => ({ mutateAsync: editar, isPending: false }),
  useAulasDisponibles: () => ({
    data: [
      { id: "a1", codigo: "Aula 12", edificio: "A", piso: "1", capacidad: 40, equipamiento: [] },
      { id: "a3", codigo: "Aula 3", edificio: "A", piso: "PB", capacidad: 30, equipamiento: [] },
    ],
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const novedadBase: NovedadDto = {
  id: "n1",
  tipo: "DEMORA",
  estado: "ACTIVA",
  minutosDemora: 10,
  enlaceVirtual: null,
  aulaNueva: null,
  mensaje: "Arranco 19:10",
  publicadaPor: { id: "u1", nombre: "Bedelía" },
  publicadaPorBedelia: true,
  createdAt: "2026-10-14T21:00:00.000Z",
  finalizadaEn: null,
  editable: true,
  comision: { id: "c1", codigo: "5K2", materia: "Proyecto Final" },
  clases: [
    {
      id: "clase-1",
      fecha: "2026-10-15",
      horaInicio: "19:00",
      horaFin: "23:00",
      estado: "DEMORADA",
    },
  ],
};

const render = (novedad: NovedadDto) =>
  renderWithProviders(<EditarNovedadDialog novedad={novedad} open onOpenChange={() => {}} />);

beforeEach(() => {
  vi.clearAllMocks();
  editar.mockResolvedValue({});
});

describe("EditarNovedadDialog", () => {
  it("viene precargada con el dato y el mensaje, y guarda solo los campos del tipo", async () => {
    const user = userEvent.setup();
    render(novedadBase);
    expect(screen.getByLabelText("Minutos estimados de demora")).toHaveValue(10);
    expect(screen.getByLabelText(/Mensaje para los estudiantes/)).toHaveValue("Arranco 19:10");
    expect(screen.queryByLabelText("Enlace de la clase virtual")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aula nueva")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Minutos estimados de demora"));
    await user.type(screen.getByLabelText("Minutos estimados de demora"), "25");
    await user.clear(screen.getByLabelText(/Mensaje para los estudiantes/));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    expect(editar.mock.calls[0][0]).toEqual({ minutosDemora: 25, mensaje: null });
  });

  it("un enlace inválido muestra el error y no guarda", async () => {
    const user = userEvent.setup();
    render({ ...novedadBase, tipo: "VIRTUAL", minutosDemora: null, enlaceVirtual: "https://a.b" });
    await user.clear(screen.getByLabelText("Enlace de la clase virtual"));
    await user.type(screen.getByLabelText("Enlace de la clase virtual"), "no-es-un-enlace");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText(/Ingresá un enlace válido/)).toBeInTheDocument();
    expect(editar).not.toHaveBeenCalled();
  });

  it("Cambio de aula ofrece las aulas libres con la actual elegida", () => {
    render({
      ...novedadBase,
      tipo: "CAMBIO_AULA",
      minutosDemora: null,
      aulaNueva: { id: "a1", codigo: "Aula 12", edificio: "A", piso: "1" },
    });
    expect(screen.getByLabelText("Aula nueva")).toHaveValue("a1");
    expect(screen.getByRole("option", { name: /Aula 3/ })).toBeInTheDocument();
  });

  it("Ausencia solo permite editar el mensaje", () => {
    render({ ...novedadBase, tipo: "AUSENCIA", minutosDemora: null });
    expect(screen.getByLabelText(/Mensaje para los estudiantes/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Minutos estimados de demora")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aula nueva")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Enlace de la clase virtual")).not.toBeInTheDocument();
  });
});
