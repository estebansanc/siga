import type { AulaDto, ClaseDto, SolicitudAulaDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SolicitudesAulaSection } from "@/components/solicitudes/solicitudes-aula-section";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

type Busqueda = { aulas: AulaDto[]; sugerencias: (AulaDto & { faltantes: string[] })[] };
type Estado = {
  solicitudes: Record<string, SolicitudAulaDto[]>;
  clasesSinAula: ClaseDto[];
  aulas: AulaDto[];
  busqueda: Busqueda;
  pedidos: (object | null)[];
};
const state = vi.hoisted((): Estado => ({
  solicitudes: {},
  clasesSinAula: [],
  aulas: [],
  busqueda: { aulas: [], sugerencias: [] },
  pedidos: [],
}));

const aprobar = vi.hoisted(() => vi.fn());
const rechazar = vi.hoisted(() => vi.fn());
const reasignar = vi.hoisted(() => vi.fn());
const asignar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-solicitudes-aula", () => ({
  useSolicitudesAula: (estados: string[]) => ({
    data: ["PENDIENTE", "ASIGNADA", "APROBADA", "RECHAZADA"]
      .filter((estado) => estados.includes(estado))
      .flatMap((estado) => state.solicitudes[estado] ?? []),
  }),
  useClasesSinAula: () => ({ data: { clases: state.clasesSinAula } }),
  useAprobarSolicitudAula: () => ({ mutateAsync: aprobar, isPending: false }),
  useRechazarSolicitudAula: () => ({ mutateAsync: rechazar, isPending: false }),
  useReasignarSolicitudAula: () => ({ mutateAsync: reasignar, isPending: false }),
  useAsignarAulaAClase: () => ({ mutateAsync: asignar, isPending: false }),
  useBuscarAulas: (pedido: object | null) => {
    state.pedidos.push(pedido);
    return { data: pedido ? { ...state.busqueda, hayAulasLibres: true } : undefined };
  },
}));
vi.mock("@/hooks/use-novedades", () => ({
  useAulasDisponibles: () => ({ data: state.aulas }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const aula = (id: string, codigo: string, capacidad = 40): AulaDto => ({
  id,
  codigo,
  edificio: "Edificio A",
  piso: "PB",
  capacidad,
  equipamiento: [],
});

const solicitud = (parcial: Partial<SolicitudAulaDto>): SolicitudAulaDto => ({
  id: "s1",
  estado: "PENDIENTE",
  alumnos: 40,
  recursos: ["Proyector"],
  comentario: null,
  motivoRechazo: null,
  createdAt: "2026-10-14T12:00:00.000Z",
  resueltaEn: null,
  solicitante: { id: "d1", nombre: "Marcos Álvarez" },
  aula: { id: "a7", codigo: "Aula 7", edificio: "Edificio B", piso: "PB" },
  clase: {
    id: "c1",
    aula: { id: "a14", codigo: "Aula 14", edificio: "Edificio A", piso: "1.º piso" },
    fecha: "2026-10-15",
    horaInicio: "19:00",
    horaFin: "23:00",
    materia: "Proyecto Final",
    comision: "5K2",
  },
  ...parcial,
});

const claseSinAula = {
  id: "c9",
  fecha: "2026-10-16",
  horaInicio: "21:00",
  horaFin: "23:00",
  estado: "PROGRAMADA",
  modalidad: "PRESENCIAL",
  comision: { id: "co1", codigo: "5K2", turno: "NOCHE" },
  materia: { id: "m1", codigo: "K5-SIM", nombre: "Simulación", anioCarrera: 5, carreraId: "k" },
  carrera: { id: "k", codigo: "K", nombre: "ISI" },
  aula: null,
  docentes: [],
  novedades: [],
} as unknown as ClaseDto;

beforeEach(() => {
  vi.clearAllMocks();
  state.solicitudes = {};
  state.clasesSinAula = [];
  state.aulas = [aula("a14", "Aula 14", 50), aula("a7", "Aula 7", 45), aula("a3", "Aula 3")];
  state.busqueda = { aulas: state.aulas, sugerencias: [] };
  state.pedidos = [];
});

describe("SolicitudesAulaSection", () => {
  const marcar = (nombre: string) => userEvent.click(screen.getByRole("button", { name: nombre }));

  it("no tiene pestañas y muestra las tarjetas Clases sin aula y Solicitudes", () => {
    renderWithProviders(<SolicitudesAulaSection />);

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Clases sin aula (0)")).toBeVisible();
    expect(screen.getByText("No hay clases sin aula")).toBeVisible();
    expect(screen.getByText("Solicitudes")).toBeVisible();
  });

  it("el contador de Clases sin aula coincide con las clases listadas", () => {
    state.clasesSinAula = [claseSinAula, { ...claseSinAula, id: "c10" }];
    renderWithProviders(<SolicitudesAulaSection />);

    expect(screen.getByText("Clases sin aula (2)")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Asignar aula" })).toHaveLength(2);
  });

  it("el filtro arranca con Pendientes y Asignación inmediata y muestra los datos", () => {
    state.solicitudes.PENDIENTE = [solicitud({ comentario: "Con parlantes" })];
    state.solicitudes.APROBADA = [solicitud({ id: "s3", estado: "APROBADA" })];
    renderWithProviders(<SolicitudesAulaSection />);

    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Asignación inmediata" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Aprobadas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Rechazadas" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getAllByText(/Proyecto Final · 5K2/)).toHaveLength(1);
    expect(screen.getByText(/Marcos Álvarez · 15\/10\/2026 · 19:00 – 23:00/)).toBeVisible();
    expect(screen.getByText(/Aula pedida: Aula 7 \(Edificio B, PB\)/)).toBeVisible();
    expect(screen.getByText("40 alumnos · Proyector")).toBeVisible();
    expect(screen.getByText("Comentario: Con parlantes")).toBeVisible();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeVisible();
  });

  it("agrupa la lista en el orden del filtro", async () => {
    state.solicitudes.PENDIENTE = [solicitud({ id: "p", comentario: "uno" })];
    state.solicitudes.APROBADA = [solicitud({ id: "a", estado: "APROBADA", comentario: "dos" })];
    state.solicitudes.RECHAZADA = [
      solicitud({ id: "r", estado: "RECHAZADA", motivoRechazo: "Hay obras" }),
    ];
    renderWithProviders(<SolicitudesAulaSection />);
    await marcar("Rechazadas");
    await marcar("Aprobadas");

    const textos = screen.getAllByText(/Comentario:|Motivo del rechazo:/).map((n) => n.textContent);
    expect(textos).toEqual(["Comentario: uno", "Comentario: dos", "Motivo del rechazo: Hay obras"]);
    expect(
      screen
        .getAllByRole("button", { name: /Aprobar|Rechazar|Reasignar/ })
        .map((b) => b.textContent),
    ).toEqual(["Aprobar", "Rechazar"]);
  });

  it("sin estados marcados y sin resultados muestra los textos vacíos", async () => {
    renderWithProviders(<SolicitudesAulaSection />);
    expect(screen.getByText("No hay solicitudes en los estados elegidos")).toBeVisible();

    await marcar("Pendientes");
    await marcar("Asignación inmediata");
    expect(screen.getByText("Elegí al menos un estado para ver solicitudes")).toBeVisible();
  });

  it("el desplegable explica los cuatro estados y arranca cerrado", async () => {
    renderWithProviders(<SolicitudesAulaSection />);
    expect(screen.queryByText(/espera tu aprobación/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Qué significa cada estado"));
    for (const texto of [
      /espera tu aprobación/,
      /empezaba en menos de 30 minutos/,
      /la clase tomó el aula elegida/,
      /la clase conservó su aula/,
    ]) {
      expect(screen.getByText(texto)).toBeVisible();
    }
  });

  it("Asignación inmediata ofrece solo Reasignar y marca la asignación inmediata", () => {
    state.solicitudes.ASIGNADA = [solicitud({ estado: "ASIGNADA" })];
    renderWithProviders(<SolicitudesAulaSection />);

    expect(screen.getByText("Asignada (inmediata)")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reasignar" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
  });

  it("Aprobadas y Rechazadas son de solo lectura y Rechazadas muestra el motivo", async () => {
    state.solicitudes.APROBADA = [solicitud({ estado: "APROBADA" })];
    state.solicitudes.RECHAZADA = [
      solicitud({ id: "s2", estado: "RECHAZADA", motivoRechazo: "Hay obras" }),
    ];
    renderWithProviders(<SolicitudesAulaSection />);
    await marcar("Pendientes");
    await marcar("Asignación inmediata");
    await marcar("Aprobadas");
    await marcar("Rechazadas");

    expect(screen.getByText("Motivo del rechazo: Hay obras")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Aprobar|Rechazar|Reasignar/ }),
    ).not.toBeInTheDocument();
  });

  it("aprobar trae el aula pedida, no ofrece la actual y confirma con la elegida", async () => {
    state.solicitudes.PENDIENTE = [solicitud({})];
    aprobar.mockResolvedValue(undefined);
    renderWithProviders(<SolicitudesAulaSection />);
    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    const dialog = await screen.findByRole("dialog", { name: "Aprobar solicitud" });
    const selector = within(dialog).getByLabelText("Aula");
    expect(selector).toHaveValue("a7");
    expect(within(dialog).queryByRole("option", { name: /Aula 14/ })).not.toBeInTheDocument();

    await userEvent.selectOptions(selector, "a3");
    await userEvent.click(within(dialog).getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(aprobar).toHaveBeenCalledWith({ id: "s1", aulaId: "a3" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("si el aula se ocupó muestra el mensaje en el diálogo y no lo cierra", async () => {
    state.solicitudes.PENDIENTE = [solicitud({})];
    aprobar.mockRejectedValue(
      new RequestError(409, "CONFLICT", "El aula ya está asignada en esa franja"),
    );
    renderWithProviders(<SolicitudesAulaSection />);
    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("dialog", { name: "Aprobar solicitud" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    expect(await within(dialog).findByText("El aula ya está asignada en esa franja")).toBeVisible();
    expect(dialog).toBeVisible();
  });

  it("rechazar exige el motivo antes de confirmar", async () => {
    state.solicitudes.PENDIENTE = [solicitud({})];
    rechazar.mockResolvedValue(undefined);
    renderWithProviders(<SolicitudesAulaSection />);
    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    const dialog = await screen.findByRole("dialog", { name: "Rechazar solicitud" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar" }));
    expect(await within(dialog).findByText("Ingresá el motivo del rechazo.")).toBeVisible();
    expect(rechazar).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText("Motivo"), "  Hay obras ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(rechazar).toHaveBeenCalledWith({ id: "s1", motivo: "Hay obras" }));
  });

  it("reasignar no ofrece el aula actual", async () => {
    state.solicitudes.ASIGNADA = [solicitud({ estado: "ASIGNADA" })];
    reasignar.mockResolvedValue(undefined);
    renderWithProviders(<SolicitudesAulaSection />);
    await userEvent.click(screen.getByRole("button", { name: "Reasignar" }));

    const dialog = await screen.findByRole("dialog", { name: "Reasignar aula" });
    expect(within(dialog).queryByRole("option", { name: /Aula 14/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText("Aula"), "a3");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reasignar" }));
    await waitFor(() => expect(reasignar).toHaveBeenCalledWith({ id: "s1", aulaId: "a3" }));
  });

  describe("Clases sin aula", () => {
    const abrirAsignar = async () => {
      state.clasesSinAula = [claseSinAula];
      asignar.mockResolvedValue(undefined);
      renderWithProviders(<SolicitudesAulaSection />);
      expect(await screen.findByText(/Simulación · 5K2/)).toBeVisible();
      await userEvent.click(screen.getByRole("button", { name: "Asignar aula" }));
      return screen.findByRole("dialog", { name: "Asignar aula" });
    };

    it("sin filtros ofrece todas las aulas libres y asigna la elegida", async () => {
      const dialog = await abrirAsignar();
      expect(within(dialog).getByLabelText("Cantidad de alumnos")).toHaveValue(null);
      for (const recurso of ["Proyector", "Pizarra", "Climatización"]) {
        expect(within(dialog).getByRole("checkbox", { name: recurso })).toBeVisible();
      }
      expect(within(dialog).getAllByRole("checkbox")).toHaveLength(7);
      expect(state.pedidos.at(-1)).toEqual({ claseId: "c9", alumnos: undefined, recursos: [] });

      const confirmar = within(dialog).getByRole("button", { name: "Asignar" });
      expect(confirmar).toBeDisabled();
      await userEvent.selectOptions(within(dialog).getByLabelText("Aula"), "a14");
      await userEvent.click(confirmar);
      await waitFor(() => expect(asignar).toHaveBeenCalledWith({ id: "c9", aulaId: "a14" }));
    });

    it("la cantidad y los recursos actualizan la búsqueda", async () => {
      const dialog = await abrirAsignar();
      await userEvent.type(within(dialog).getByLabelText("Cantidad de alumnos"), "30");
      await userEvent.click(within(dialog).getByRole("checkbox", { name: "Proyector" }));
      expect(state.pedidos.at(-1)).toEqual({
        claseId: "c9",
        alumnos: 30,
        recursos: ["Proyector"],
      });
    });

    it.each(["0", "2.5"])("la cantidad %s muestra el error y no deja asignar", async (valor) => {
      const dialog = await abrirAsignar();
      await userEvent.selectOptions(within(dialog).getByLabelText("Aula"), "a14");
      await userEvent.type(within(dialog).getByLabelText("Cantidad de alumnos"), valor);

      expect(
        await within(dialog).findByText("Ingresá una cantidad de alumnos mayor que 0."),
      ).toBeVisible();
      expect(within(dialog).getByRole("button", { name: "Asignar" })).toBeDisabled();
      expect(state.pedidos.at(-1)).toBeNull();
    });

    it("sin coincidencias avisa y lista las aulas con todo lo que incumplen", async () => {
      state.busqueda = {
        aulas: [],
        sugerencias: [
          {
            ...aula("a14", "Aula 14", 50),
            faltantes: ["Capacidad para 500 alumnos", "Sin proyector"],
          },
        ],
      };
      const dialog = await abrirAsignar();
      await userEvent.type(within(dialog).getByLabelText("Cantidad de alumnos"), "500");

      expect(
        await within(dialog).findByText("Ninguna aula cumple todos los criterios."),
      ).toBeVisible();
      expect(
        within(dialog).getByRole("option", {
          name: /Aula 14.*Capacidad para 500 alumnos, Sin proyector/,
        }),
      ).toBeInTheDocument();
    });

    it("si el aula se ocupó muestra el aviso y deja elegir otra sin cerrar", async () => {
      const dialog = await abrirAsignar();
      asignar.mockRejectedValueOnce(
        new RequestError(409, "CONFLICT", "El aula ya está asignada en esa franja"),
      );
      await userEvent.selectOptions(within(dialog).getByLabelText("Aula"), "a14");
      await userEvent.click(within(dialog).getByRole("button", { name: "Asignar" }));

      expect(
        await within(dialog).findByText("El aula ya está asignada en esa franja"),
      ).toBeVisible();
      await userEvent.selectOptions(within(dialog).getByLabelText("Aula"), "a7");
      await userEvent.click(within(dialog).getByRole("button", { name: "Asignar" }));
      await waitFor(() => expect(asignar).toHaveBeenLastCalledWith({ id: "c9", aulaId: "a7" }));
    });
  });
});
