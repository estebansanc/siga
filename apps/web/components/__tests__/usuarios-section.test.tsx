import type { UsuarioDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsuariosSection } from "@/components/usuarios/usuarios-section";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  usuarios: undefined as UsuarioDto[] | undefined,
  filtros: [] as { q?: string; perfil?: string }[],
}));

const mutations = vi.hoisted(() => ({
  crear: vi.fn(),
  actualizar: vi.fn(),
  desactivar: vi.fn(),
  reactivar: vi.fn(),
  reenviar: vi.fn(),
}));

vi.mock("@/hooks/use-usuarios", () => ({
  useUsuarios: (filtro: { q?: string; perfil?: string }) => {
    state.filtros.push(filtro);
    return { data: state.usuarios };
  },
  useCrearUsuario: () => ({ mutateAsync: mutations.crear, isPending: false }),
  useActualizarUsuario: () => ({ mutateAsync: mutations.actualizar, isPending: false }),
  useDesactivarUsuario: () => ({ mutateAsync: mutations.desactivar, isPending: false }),
  useReactivarUsuario: () => ({ mutateAsync: mutations.reactivar, isPending: false }),
  useReenviarActivacion: () => ({ mutateAsync: mutations.reenviar, isPending: false }),
}));

vi.mock("@/hooks/use-datos-academicos", () => ({
  useComisiones: () => ({
    data: [{ id: "c1", codigo: "5K2", materia: { nombre: "Proyecto Final" } }],
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const usuario = (cambios: Partial<UsuarioDto>): UsuarioDto => ({
  id: "u",
  nombre: "Usuario",
  correo: "u@example.com",
  dni: "30123456",
  legajo: null,
  perfil: "ESTUDIANTE",
  estado: "ACTIVO",
  comisiones: [],
  esPropio: false,
  esAdministrador: false,
  bajaSolicitada: null,
  ...cambios,
});

const propio = usuario({
  id: "yo",
  nombre: "Bea Bedel",
  correo: "bea@example.com",
  perfil: "BEDEL",
  esPropio: true,
});
const pendiente = usuario({
  id: "p",
  nombre: "Pablo Pendiente",
  correo: "pablo@example.com",
  perfil: "DOCENTE",
  estado: "PENDIENTE",
  comisiones: [{ id: "c1", codigo: "5K2", materia: "Proyecto Final" }],
});
const desactivado = usuario({
  id: "d",
  nombre: "Dora Desactivada",
  correo: "dora@example.com",
  estado: "DESACTIVADO",
});

const filaDe = (texto: string) =>
  screen.getAllByRole("row").find((fila) => fila.textContent?.includes(texto)) as HTMLElement;

const abrirAcciones = async (nombre: string) => {
  await userEvent.click(screen.getByRole("button", { name: `Acciones de ${nombre}` }));
};

// El menú de base-ui anima al abrir y deja `pointer-events: none` hasta terminar; en jsdom la
// animación no termina de forma fiable, así que se omite esa verificación en el clic.
const elegirAccion = async (nombre: string) => {
  const item = await screen.findByRole("menuitem", { name: nombre });
  await userEvent.setup({ pointerEventsCheck: 0 }).click(item);
};

beforeEach(() => {
  vi.clearAllMocks();
  state.filtros = [];
  state.usuarios = [propio, pendiente, desactivado];
  for (const mutation of Object.values(mutations)) mutation.mockResolvedValue({});
});

describe("UsuariosSection", () => {
  it("muestra esqueletos mientras carga", () => {
    state.usuarios = undefined;
    renderWithProviders(<UsuariosSection />);
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("lista nombre, correo, DNI, perfil y estado de cada cuenta", () => {
    renderWithProviders(<UsuariosSection />);
    const fila = filaDe("Pablo Pendiente");
    expect(within(fila).getByText("pablo@example.com")).toBeInTheDocument();
    expect(within(fila).getAllByText(/30123456/).length).toBeGreaterThan(0);
    expect(within(fila).getByText("Docente")).toBeInTheDocument();
    expect(within(fila).getByText("Pendiente de activación")).toBeInTheDocument();
    expect(within(filaDe("Dora Desactivada")).getByText("Desactivado")).toBeInTheDocument();
    expect(within(filaDe("Bea Bedel")).getByText("Activo")).toBeInTheDocument();
  });

  it("busca por texto y filtra por perfil con la consulta a la API", async () => {
    renderWithProviders(<UsuariosSection />);
    await userEvent.type(screen.getByLabelText("Buscar usuarios"), "pablo");
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por perfil"), "DOCENTE");
    await waitFor(() =>
      expect(state.filtros.at(-1)).toEqual({ q: "pablo", perfil: "DOCENTE", bajaSolicitada: "" }),
    );
  });

  it("los dos filtros conservan sus opciones y textos", () => {
    renderWithProviders(<UsuariosSection />);
    const opciones = (etiqueta: string) =>
      within(screen.getByLabelText(etiqueta))
        .getAllByRole("option")
        .map((opcion) => opcion.textContent);
    expect(opciones("Filtrar por perfil")).toEqual([
      "Todos los perfiles",
      "Estudiante",
      "Docente",
      "Bedel",
      "Autoridad académica",
    ]);
    expect(opciones("Filtrar por solicitud de baja")).toEqual([
      "Todas las cuentas",
      "Baja solicitada",
    ]);
  });

  it("marca la baja solicitada con fecha y motivo y filtra esas cuentas", async () => {
    state.usuarios = [
      usuario({
        id: "b",
        nombre: "Bruno Baja",
        bajaSolicitada: { solicitadaEn: "2026-10-28T15:00:00.000Z", motivo: "Dejo la institución" },
      }),
    ];
    renderWithProviders(<UsuariosSection />);
    const fila = filaDe("Bruno Baja");
    expect(within(fila).getByText("Baja solicitada")).toBeInTheDocument();
    expect(within(fila).getByText(/28\/10\/2026 · Dejo la institución/)).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByLabelText("Filtrar por solicitud de baja"),
      "Baja solicitada",
    );
    await waitFor(() => expect(state.filtros.at(-1)).toMatchObject({ bajaSolicitada: "true" }));
  });

  it("sin resultados explica qué probar", () => {
    state.usuarios = [];
    renderWithProviders(<UsuariosSection />);
    expect(screen.getByText("No hay usuarios para mostrar")).toBeInTheDocument();
  });

  it("en su propia cuenta no ofrece Desactivar y el perfil queda deshabilitado", async () => {
    renderWithProviders(<UsuariosSection />);
    await abrirAcciones("Bea Bedel");
    expect(screen.queryByRole("menuitem", { name: "Desactivar" })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar Bea Bedel" });
    expect(within(dialog).getByLabelText("Perfil")).toBeDisabled();
    expect(within(dialog).getByLabelText("Correo")).toBeDisabled();
  });

  it("marca solo al Administrador y no le ofrece Desactivar", async () => {
    const admin = usuario({
      id: "adm",
      nombre: "Ada Admin",
      correo: "ada@example.com",
      perfil: "AUTORIDAD",
      esAdministrador: true,
    });
    state.usuarios = [admin, pendiente];
    renderWithProviders(<UsuariosSection />);
    expect(await screen.findAllByText("Administrador")).toHaveLength(1);
    await abrirAcciones("Ada Admin");
    expect(await screen.findByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Desactivar" })).not.toBeInTheDocument();
  });

  it("desactiva con confirmación y reactiva sin ella", async () => {
    renderWithProviders(<UsuariosSection />);
    await abrirAcciones("Pablo Pendiente");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Desactivar" }));
    const alerta = await screen.findByRole("alertdialog", {
      name: "¿Desactivar a Pablo Pendiente?",
    });
    await userEvent.click(within(alerta).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(mutations.desactivar).toHaveBeenCalledWith("p"));

    await abrirAcciones("Dora Desactivada");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Reactivar" }));
    await waitFor(() => expect(mutations.reactivar).toHaveBeenCalledWith("d"));
  });

  it("no ofrece reenviar el enlace a las cuentas que no están pendientes", async () => {
    renderWithProviders(<UsuariosSection />);
    await abrirAcciones("Dora Desactivada");
    await screen.findByRole("menuitem", { name: "Reactivar" });
    expect(screen.queryByRole("menuitem", { name: /Reenviar/ })).not.toBeInTheDocument();
  });

  it("reenvía el enlace a las cuentas pendientes", async () => {
    renderWithProviders(<UsuariosSection />);
    await abrirAcciones("Pablo Pendiente");
    await elegirAccion("Reenviar enlace de activación");
    await waitFor(() => expect(mutations.reenviar).toHaveBeenCalledWith("p"));
  });

  it("el alta valida DNI y correo en el campo antes de llamar a la API", async () => {
    renderWithProviders(<UsuariosSection />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const dialog = await screen.findByRole("dialog", { name: "Nuevo usuario" });
    await userEvent.type(within(dialog).getByLabelText("Apellido y nombre"), "Gómez, Luis");
    await userEvent.type(within(dialog).getByLabelText("DNI"), "123");
    await userEvent.type(within(dialog).getByLabelText("Correo"), "no-es-correo");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("El DNI debe tener 7 u 8 dígitos")).toBeVisible();
    expect(within(dialog).getByText("Ingresá un correo válido")).toBeVisible();
    expect(mutations.crear).not.toHaveBeenCalled();
  });

  it("un alta válida de Docente manda perfil y comisiones", async () => {
    renderWithProviders(<UsuariosSection />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const dialog = await screen.findByRole("dialog", { name: "Nuevo usuario" });
    await userEvent.type(within(dialog).getByLabelText("Apellido y nombre"), "Gómez, Luis");
    await userEvent.type(within(dialog).getByLabelText("DNI"), "28111222");
    await userEvent.type(within(dialog).getByLabelText("Correo"), "Luis@Example.com");
    await userEvent.selectOptions(within(dialog).getByLabelText("Perfil"), "DOCENTE");
    await userEvent.click(await within(dialog).findByRole("checkbox", { name: /5K2/ }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mutations.crear).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: "Gómez, Luis",
          dni: "28111222",
          correo: "luis@example.com",
          perfil: "DOCENTE",
          comisionIds: ["c1"],
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("un DNI repetido que informa la API queda en su campo y el pop-up sigue abierto", async () => {
    mutations.crear.mockRejectedValueOnce(
      new RequestError(409, "CONFLICT", "Ya existe un usuario con ese DNI", [
        { path: "dni", message: "Ya existe un usuario con ese DNI" },
      ]),
    );
    renderWithProviders(<UsuariosSection />);
    await userEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const dialog = await screen.findByRole("dialog", { name: "Nuevo usuario" });
    await userEvent.type(within(dialog).getByLabelText("Apellido y nombre"), "Gómez, Luis");
    await userEvent.type(within(dialog).getByLabelText("DNI"), "28111222");
    await userEvent.type(within(dialog).getByLabelText("Correo"), "luis@example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("Ya existe un usuario con ese DNI")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Nuevo usuario" })).toBeInTheDocument();
  });

  it("edita a un autorregistrado sin DNI y guarda un cambio de nombre", async () => {
    state.usuarios = [usuario({ id: "s", nombre: "Sin Dni", dni: null, correo: "s@example.com" })];
    renderWithProviders(<UsuariosSection />);
    await abrirAcciones("Sin Dni");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar Sin Dni" });
    await userEvent.type(within(dialog).getByLabelText("Apellido y nombre"), " Pérez");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mutations.actualizar).toHaveBeenCalledWith({
        id: "s",
        input: expect.objectContaining({ nombre: "Sin Dni Pérez", dni: undefined }),
      }),
    );
  });

  it("no deja vaciar un DNI que ya existía", async () => {
    renderWithProviders(<UsuariosSection />);
    await abrirAcciones("Pablo Pendiente");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar Pablo Pendiente" });
    await userEvent.clear(within(dialog).getByLabelText("DNI"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(await within(dialog).findByText("El DNI no se puede dejar vacío")).toBeVisible();
    expect(mutations.actualizar).not.toHaveBeenCalled();
  });
});
