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
  useClase: (id: string | null) => ({ data: state.clases.find((clase) => clase.id === id) }),
}));
vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-aulas", () => ({ useAulas: () => ({ data: [] }) }));
vi.mock("@/hooks/use-incidencias", () => ({
  useReportarIncidencia: () => ({ mutateAsync: reportar, isPending: false }),
}));
vi.mock("@/components/novedades/publicar-novedad-dialog", () => ({
  PublicarNovedadDialog: ({ claseInicial }: { claseInicial?: ClaseDto }) => (
    <div role="dialog" aria-label="Publicar novedad">
      {claseInicial?.id}
    </div>
  ),
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

const abrirMenu = () =>
  userEvent.click(screen.getByRole("button", { name: "Acciones de Proyecto Final 5K2" }));

describe("MisClasesDocente", () => {
  it("no muestra botones de texto Incidencia ni Novedad en la tarjeta", () => {
    renderWithProviders(<MisClasesDocente />);
    expect(screen.queryByRole("button", { name: /^(Incidencia|Novedad)$/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Acciones de Proyecto Final 5K2" })).toBeVisible();
  });

  it("no muestra el bloque Acciones rápidas ni sus destinos", async () => {
    renderWithProviders(<MisClasesDocente />);
    await screen.findByText("Proyecto Final");
    expect(screen.queryByText("Acciones rápidas")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("sin clases hoy muestra solo el estado vacío", async () => {
    state.clases = [];
    renderWithProviders(<MisClasesDocente />);
    expect(await screen.findByText("No tenés clases hoy")).toBeVisible();
    expect(screen.queryByText("Acciones rápidas")).toBeNull();
  });

  it("reporta una incidencia desde el menú, enviando la clase", async () => {
    renderWithProviders(<MisClasesDocente />);
    await abrirMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reportar incidencia" }));
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

  it("publica una novedad desde el menú con la clase preseleccionada", async () => {
    renderWithProviders(<MisClasesDocente />);
    await abrirMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Publicar novedad" }));
    expect(await screen.findByRole("dialog", { name: "Publicar novedad" })).toHaveTextContent(
      "clase-1",
    );
  });

  it("deshabilita Reportar incidencia con motivo en una clase sin aula", async () => {
    state.clases = [{ ...clase, aula: null }];
    renderWithProviders(<MisClasesDocente />);
    await abrirMenu();
    const item = await screen.findByRole("menuitem", { name: /Reportar incidencia/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("La clase no tiene aula asignada");
  });

  it.each([
    ["SUSPENDIDA", "Suspendida"],
    ["AUSENTE", "Ausente"],
    ["FINALIZADA", "Finalizada"],
  ] as const)("deshabilita Publicar novedad con la clase %s", async (estado, texto) => {
    state.clases = [{ ...clase, estado }];
    renderWithProviders(<MisClasesDocente />);
    await abrirMenu();
    const item = await screen.findByRole("menuitem", { name: /Publicar novedad/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent(`La clase está ${texto}`);
  });

  it("abrir el menú o elegir una acción no abre el detalle; tocar la tarjeta sí", async () => {
    renderWithProviders(<MisClasesDocente />);
    await abrirMenu();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Publicar novedad" }));
    await screen.findByRole("dialog", { name: "Publicar novedad" });
    expect(screen.queryByRole("dialog", { name: /Proyecto Final/ })).toBeNull();

    await userEvent.click(screen.getByText("Proyecto Final"));
    expect(await screen.findByRole("dialog", { name: /Proyecto Final/ })).toBeVisible();
  });

  it("el menú se abre con teclado, se recorre con flechas y se elige con Enter", async () => {
    renderWithProviders(<MisClasesDocente />);
    screen.getByRole("button", { name: "Acciones de Proyecto Final 5K2" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("menuitem", { name: "Reportar incidencia" })).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(await screen.findByRole("dialog", { name: "Publicar novedad" })).toBeVisible();
  });
});
