import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CarrerasTab } from "@/components/datos-academicos/carreras-tab";
import { ComisionesTab } from "@/components/datos-academicos/comisiones-tab";
import { DatosAcademicosSection } from "@/components/datos-academicos/datos-academicos-section";
import { HorariosTab } from "@/components/datos-academicos/horarios-tab";
import { PeriodosTab } from "@/components/datos-academicos/periodos-tab";
import { AccesoDenegado } from "@/components/errors/acceso-denegado";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  crear: vi.fn(),
  darDeBaja: vi.fn(),
  generar: vi.fn(),
  error: vi.fn(),
  carreras: [] as unknown[],
  accion: (fn: () => unknown) => () => ({ mutateAsync: fn, isPending: false }),
  listado: (data: unknown[]) => () => ({ data }),
}));

vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarrerasGestion: (bajas: boolean) => ({
    data: (mocks.carreras as { activa: boolean }[]).filter((carrera) => carrera.activa === !bajas),
  }),
  useCrearCarrera: mocks.accion(mocks.crear),
  useActualizarCarrera: mocks.accion(mocks.crear),
  useDarDeBajaCarrera: mocks.accion(mocks.darDeBaja),
  useReactivarCarrera: mocks.accion(mocks.crear),
  useMateriasGestion: mocks.listado([
    {
      id: "m1",
      codigo: "K5",
      nombre: "Proyecto Final",
      anioCarrera: 5,
      carreraId: "c1",
      activa: true,
    },
  ]),
  useCrearMateria: mocks.accion(mocks.crear),
  useActualizarMateria: mocks.accion(mocks.crear),
  useDarDeBajaMateria: mocks.accion(mocks.crear),
  useReactivarMateria: mocks.accion(mocks.crear),
  usePeriodosGestion: mocks.listado([
    {
      id: "p1",
      nombre: "1.er cuatrimestre",
      fechaInicio: "2030-03-04",
      fechaFin: "2030-06-30",
      activo: true,
    },
  ]),
  useCrearPeriodo: mocks.accion(mocks.crear),
  useActualizarPeriodo: mocks.accion(mocks.crear),
  useDarDeBajaPeriodo: mocks.accion(mocks.crear),
  useReactivarPeriodo: mocks.accion(mocks.crear),
  useComisionesGestion: mocks.listado([
    {
      id: "k1",
      codigo: "5K2",
      turno: "NOCHE",
      anioLectivo: 2030,
      activa: true,
      materia: {
        id: "m1",
        codigo: "K5",
        nombre: "Proyecto Final",
        anioCarrera: 5,
        carreraId: "c1",
      },
      periodoLectivo: { id: "p1", nombre: "1.er cuatrimestre" },
      docentes: [],
    },
  ]),
  useCrearComision: mocks.accion(mocks.crear),
  useActualizarComision: mocks.accion(mocks.crear),
  useDarDeBajaComision: mocks.accion(mocks.crear),
  useReactivarComision: mocks.accion(mocks.crear),
  useDocentesAsignables: mocks.listado([
    { id: "d1", nombre: "Marcos Álvarez" },
    { id: "d2", nombre: "Ana Pérez" },
  ]),
  useAulasHabituales: mocks.listado([
    {
      id: "a1",
      codigo: "Aula 12",
      edificio: "Edificio A",
      piso: "1",
      capacidad: 60,
      equipamiento: [],
    },
  ]),
  useHorariosGestion: mocks.listado([
    {
      id: "h1",
      diaSemana: 1,
      horaInicio: "07:00",
      horaFin: "13:00",
      activo: true,
      comision: { id: "k1", codigo: "5K1", materia: "Proyecto Final" },
      aulaHabitual: null,
    },
  ]),
  useCrearHorario: mocks.accion(mocks.crear),
  useActualizarHorario: mocks.accion(mocks.crear),
  useDarDeBajaHorario: mocks.accion(mocks.crear),
  useReactivarHorario: mocks.accion(mocks.crear),
  useDiasNoLaborablesGestion: mocks.listado([]),
  useCrearDiaNoLaborable: mocks.accion(mocks.crear),
  useActualizarDiaNoLaborable: mocks.accion(mocks.crear),
  useDarDeBajaDiaNoLaborable: mocks.accion(mocks.crear),
  useReactivarDiaNoLaborable: mocks.accion(mocks.crear),
  useGenerarClases: mocks.accion(mocks.generar),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.error } }));

const carrera = (datos: object) => ({
  id: "c1",
  codigo: "K",
  nombre: "Sistemas",
  activa: true,
  ...datos,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.carreras = [
    carrera({}),
    carrera({ id: "c2", codigo: "E", nombre: "Eléctrica", activa: false }),
  ];
});

describe("Datos académicos", () => {
  it("muestra las seis pestañas", () => {
    renderWithProviders(<DatosAcademicosSection />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Carreras",
      "Materias",
      "Períodos",
      "Comisiones",
      "Horarios",
      "Días no laborables",
    ]);
  });

  it("Acceso denegado para quien no administra", () => {
    renderWithProviders(<AccesoDenegado />);
    expect(screen.getByText("Acceso denegado")).toBeVisible();
  });
});

describe("carreras", () => {
  it("lista las activas y, en De baja, las dadas de baja con su badge y la opción de reactivar", async () => {
    renderWithProviders(<CarrerasTab />);
    expect(screen.getByText("Sistemas")).toBeVisible();
    expect(screen.queryByText("Eléctrica")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "De baja" }));
    expect(screen.getByText("Eléctrica")).toBeVisible();
    expect(screen.getByText("De baja", { selector: "[data-slot=badge]" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Acciones de Eléctrica" }));
    expect(await screen.findByRole("menuitem", { name: "Reactivar" })).toBeVisible();
  });

  it("muestra el código repetido en el campo", async () => {
    mocks.crear.mockRejectedValueOnce(
      new RequestError(409, "CONFLICT", "Ya existe una carrera con ese código"),
    );
    renderWithProviders(<CarrerasTab />);
    await userEvent.click(screen.getByRole("button", { name: "Nueva carrera" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva carrera" });
    await userEvent.type(within(dialog).getByLabelText("Código"), "K");
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Otra");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("Ya existe una carrera con ese código")).toBeVisible();
  });

  it("la baja rechazada por dependientes muestra el mensaje", async () => {
    mocks.darDeBaja.mockRejectedValueOnce(
      new RequestError(
        409,
        "CONFLICT",
        "No se puede dar de baja la carrera: tiene 1 materia activa",
      ),
    );
    renderWithProviders(<CarrerasTab />);
    await userEvent.click(screen.getByRole("button", { name: "Acciones de Sistemas" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Dar de baja" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Dar de baja" }),
    );
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "No se puede dar de baja la carrera: tiene 1 materia activa",
      ),
    );
  });
});

describe("períodos", () => {
  it("rechaza un fin no posterior al inicio, en el campo, sin enviar", async () => {
    renderWithProviders(<PeriodosTab />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo período" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo período" });
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "2.º cuatrimestre");
    await userEvent.type(within(dialog).getByLabelText("Inicio"), "2030-08-10");
    await userEvent.type(within(dialog).getByLabelText("Fin"), "2030-08-10");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(
      await within(dialog).findByText("La fecha de fin debe ser posterior a la de inicio"),
    ).toBeVisible();
    expect(mocks.crear).not.toHaveBeenCalled();
  });

  it("genera las clases del período y muestra el resumen", async () => {
    mocks.generar.mockResolvedValueOnce({ creadas: 12, existentes: 0, sinAula: 1 });
    renderWithProviders(<PeriodosTab />);
    await userEvent.click(screen.getByRole("button", { name: "Acciones de 1.er cuatrimestre" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Generar clases" }));
    await userEvent.click(screen.getByRole("button", { name: "Generar clases" }));
    const resumen = await screen.findByLabelText("Resumen de la generación");
    expect(within(resumen).getByText("12")).toBeVisible();
    expect(mocks.generar).toHaveBeenCalledWith({ periodoLectivoId: "p1" });
  });
});

describe("comisiones", () => {
  it("el selector lista los docentes disponibles y envía los elegidos", async () => {
    renderWithProviders(<ComisionesTab />);
    await userEvent.click(screen.getByRole("button", { name: "Nueva comisión" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva comisión" });
    const docentes = within(within(dialog).getByRole("group", { name: "Docentes" }));
    expect(docentes.getAllByRole("checkbox")).toHaveLength(2);

    await userEvent.selectOptions(within(dialog).getByLabelText("Materia"), "m1");
    await userEvent.selectOptions(within(dialog).getByLabelText("Período"), "p1");
    await userEvent.type(within(dialog).getByLabelText("Código"), "5K9");
    await userEvent.click(docentes.getByRole("checkbox", { name: "Marcos Álvarez" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mocks.crear).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: "5K9", docenteIds: ["d1"], turno: "NOCHE" }),
      ),
    );
  });
});

describe("horarios", () => {
  it("lista la franja en 24 h con rango HH:mm – HH:mm", () => {
    renderWithProviders(<HorariosTab />);
    expect(screen.getByText(/07:00 – 13:00/)).toBeVisible();
  });

  const completar = async (dialog: HTMLElement, fin: string) => {
    await userEvent.selectOptions(within(dialog).getByLabelText("Comisión"), "k1");
    await userEvent.type(within(dialog).getByLabelText("Desde"), "19:00");
    await userEvent.type(within(dialog).getByLabelText("Hasta"), fin);
  };

  it("rechaza un fin no posterior al inicio, en el campo", async () => {
    renderWithProviders(<HorariosTab />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo horario" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo horario" });
    await completar(dialog, "19:00");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(
      await within(dialog).findByText("La hora de fin debe ser posterior a la de inicio"),
    ).toBeVisible();
    expect(mocks.crear).not.toHaveBeenCalled();
  });

  it("un aula ocupada muestra en el campo qué comisión la usa", async () => {
    const mensaje = "El aula Aula 12 ya está asignada a la comisión 5K1 de Proyecto Final";
    mocks.crear.mockRejectedValueOnce(new RequestError(409, "CONFLICT", mensaje));
    renderWithProviders(<HorariosTab />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo horario" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo horario" });
    await completar(dialog, "21:00");
    await userEvent.selectOptions(within(dialog).getByLabelText("Aula habitual"), "a1");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText(mensaje)).toBeVisible();
    expect(mocks.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        diaSemana: 1,
        horaInicio: "19:00",
        horaFin: "21:00",
        aulaHabitualId: "a1",
      }),
    );
  });
});
