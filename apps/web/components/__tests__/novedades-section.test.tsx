import type { NovedadDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NovedadesSection } from "@/components/novedades/novedades-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ novedades: [] as NovedadDto[] }));
vi.mock("@/hooks/use-novedades", () => ({
  useNovedades: () => ({ data: state.novedades }),
  useFinalizarNovedad: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/components/novedades/historial-novedades", () => ({
  HistorialNovedades: () => <p>Historial de novedades</p>,
}));
vi.mock("@/components/novedades/publicar-novedad-dialog", () => ({
  PublicarNovedadDialog: () => null,
}));
vi.mock("@/components/novedades/editar-novedad-dialog", () => ({
  EditarNovedadDialog: ({ novedad }: { novedad: NovedadDto }) => <p>Editando {novedad.id}</p>,
}));

const novedad: NovedadDto = {
  id: "n1",
  tipo: "DEMORA",
  estado: "ACTIVA",
  minutosDemora: 10,
  enlaceVirtual: null,
  aulaNueva: null,
  mensaje: null,
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

const abrirMenu = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /Acciones de la novedad/ }));

beforeEach(() => {
  state.novedades = [novedad];
});

describe("NovedadesSection", () => {
  it("ofrece Editar novedad en una activa a quien gestiona y abre el formulario", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(<NovedadesSection puedePublicar />);
    await abrirMenu(user);
    await user.click(await screen.findByRole("menuitem", { name: "Editar novedad" }));
    expect(screen.getByText("Editando n1")).toBeInTheDocument();
  });

  it("abre en Activas y el Historial es otra pestaña de solo lectura", async () => {
    renderWithProviders(<NovedadesSection puedePublicar />);
    expect(screen.getByRole("tab", { name: "Activas", selected: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Publicar novedad" })).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "Historial" }));
    expect(await screen.findByText("Historial de novedades")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Publicar novedad" })).toBeNull();
  });

  it("la autoridad no ve acciones sobre las novedades", () => {
    renderWithProviders(<NovedadesSection puedePublicar={false} />);
    expect(
      screen.queryByRole("button", { name: /Acciones de la novedad/ }),
    ).not.toBeInTheDocument();
  });

  it("una novedad finalizada o sin clases vigentes no ofrece Editar novedad", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    state.novedades = [{ ...novedad, estado: "FINALIZADA", editable: false }];
    const { unmount } = renderWithProviders(<NovedadesSection puedePublicar />);
    expect(
      screen.queryByRole("button", { name: /Acciones de la novedad/ }),
    ).not.toBeInTheDocument();
    unmount();

    state.novedades = [{ ...novedad, editable: false }];
    renderWithProviders(<NovedadesSection puedePublicar />);
    await abrirMenu(user);
    expect(await screen.findByRole("menuitem", { name: "Finalizar novedad" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Editar novedad" })).not.toBeInTheDocument();
  });

  it("Ausencia editable ofrece Editar y no Finalizar", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    state.novedades = [{ ...novedad, tipo: "AUSENCIA", minutosDemora: null }];
    renderWithProviders(<NovedadesSection puedePublicar />);
    await abrirMenu(user);
    expect(await screen.findByRole("menuitem", { name: "Editar novedad" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Finalizar novedad" })).not.toBeInTheDocument();
  });

  it("una Virtual activa muestra el link a pestaña nueva y no la URL; el resto no", () => {
    const enlaceVirtual = "https://meet.google.com/abc-defg-hij";
    state.novedades = [
      { ...novedad, id: "v1", tipo: "VIRTUAL", minutosDemora: null, enlaceVirtual },
      {
        ...novedad,
        id: "v2",
        tipo: "VIRTUAL",
        minutosDemora: null,
        enlaceVirtual,
        editable: false,
        estado: "FINALIZADA",
      },
      { ...novedad, id: "d1" },
    ];
    renderWithProviders(<NovedadesSection puedePublicar />);
    const links = screen.getAllByRole("link", { name: "Entrar a la clase virtual" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", enlaceVirtual);
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(screen.queryByText(enlaceVirtual)).not.toBeInTheDocument();
  });

  it("ordena tipo, fechas, materia y comisión, mensaje, link y pie, con las fechas destacadas", () => {
    state.novedades = [
      {
        ...novedad,
        tipo: "VIRTUAL",
        minutosDemora: null,
        enlaceVirtual: "https://meet.google.com/abc-defg-hij",
        mensaje: "Por Meet",
        clases: [
          { ...novedad.clases[0] },
          { ...novedad.clases[0], id: "clase-2", fecha: "2026-10-22" },
        ],
      },
    ];
    renderWithProviders(<NovedadesSection puedePublicar />);
    const fechas = screen.getByText("15/10/2026 19:00, 22/10/2026 19:00");
    expect(fechas).toHaveClass("font-medium");
    const orden = [
      screen.getByText("Virtual"),
      fechas,
      screen.getByText("Proyecto Final · 5K2"),
      screen.getByText("“Por Meet”"),
      screen.getByRole("link", { name: "Entrar a la clase virtual" }),
      screen.getByText(/Bedelía/),
    ];
    orden.slice(1).forEach((elemento, indice) => {
      expect(
        orden[indice].compareDocumentPosition(elemento) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });
});
