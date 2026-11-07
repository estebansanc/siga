import type { AulaGestionDto, PlanoPisoDto } from "@repo/api/client";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportarPlanoDialog } from "@/components/aulas/importar-plano/importar-plano-dialog";
import { RequestError } from "@/lib/api-client";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({
  planos: [] as unknown[],
  activas: [] as unknown[],
  bajas: [] as unknown[],
  paginas: 2,
}));
const guardar = vi.hoisted(() => vi.fn());
const detectar = vi.hoisted(() => vi.fn());
const importar = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-planos", () => ({
  usePlanos: () => ({ data: state.planos }),
  useGuardarPlano: () => ({ mutateAsync: guardar, isPending: false }),
  useDetectarAulas: () => ({ mutateAsync: detectar, isPending: false }),
  useImportarAulas: () => ({ mutateAsync: importar, isPending: false }),
}));
vi.mock("@/hooks/use-aulas", () => ({
  useAulas: (bajas: boolean) => ({ data: bajas ? state.bajas : state.activas }),
}));
vi.mock("@/lib/archivo-plano", () => ({
  esPdf: (archivo: File) => archivo.type === "application/pdf",
  contarPaginasDelPdf: () => Promise.resolve(state.paginas),
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: vi.fn() } }));

const rectangulo = (x: number) => [
  { x, y: 0.1 },
  { x: x + 0.1, y: 0.1 },
  { x: x + 0.1, y: 0.3 },
  { x, y: 0.3 },
];

const plano: PlanoPisoDto = {
  id: "p1",
  edificio: "Edificio A",
  piso: "2.º piso",
  ancho: 1000,
  alto: 800,
  imagenUrl: "https://r2.test/plano.jpg",
  aulasUbicadas: 0,
};

const existente = (datos: Partial<AulaGestionDto>): AulaGestionDto => ({
  id: "x",
  codigo: "Aula 22",
  edificio: "Edificio A",
  piso: "2.º piso",
  capacidad: 30,
  equipamiento: [],
  estado: "DISPONIBLE",
  observaciones: null,
  activa: true,
  ocupada: false,
  ...datos,
});

const pdf = new File(["x"], "plano.pdf", { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  state.planos = [];
  state.activas = [];
  state.bajas = [];
  state.paginas = 2;
  guardar.mockResolvedValue(plano);
  detectar.mockResolvedValue({
    aulas: [
      { nombre: "Aula 21", confianza: 0.9, poligono: rectangulo(0.1) },
      { nombre: "Aula 22", confianza: 0.3, poligono: rectangulo(0.3) },
      { nombre: null, confianza: 0.9, poligono: rectangulo(0.5) },
    ],
  });
  importar.mockResolvedValue({
    creadas: [
      { id: "n1", codigo: "Aula 21" },
      { id: "n2", codigo: "Aula 23" },
    ],
    ubicadas: [{ id: "x", codigo: "Aula 22" }],
  });
});

const abrir = (onClose = vi.fn()) => {
  const user = userEvent.setup({ applyAccept: false });
  renderWithProviders(<ImportarPlanoDialog onClose={onClose} />);
  return { user, onClose };
};

const completarPaso1 = async (user: ReturnType<typeof userEvent.setup>, archivo = pdf) => {
  await user.type(screen.getByLabelText("Edificio"), "Edificio A");
  await user.type(screen.getByLabelText("Piso"), "2.º piso");
  await user.upload(screen.getByLabelText("Archivo del plano"), archivo);
};

describe("Importar desde plano: paso 1", () => {
  it("rechaza un archivo que no es PDF, PNG o JPG o pesa más de 20 MB", async () => {
    const { user } = abrir();
    await user.upload(
      screen.getByLabelText("Archivo del plano"),
      new File(["x"], "plano.gif", { type: "image/gif" }),
    );
    expect(
      await screen.findByText("El plano debe ser un PDF, PNG o JPG de hasta 20 MB"),
    ).toBeInTheDocument();

    const grande = new File(["x"], "grande.png", { type: "image/png" });
    Object.defineProperty(grande, "size", { value: 21 * 1024 * 1024 });
    await user.upload(screen.getByLabelText("Archivo del plano"), grande);
    expect(
      await screen.findByText("El plano debe ser un PDF, PNG o JPG de hasta 20 MB"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(guardar).not.toHaveBeenCalled();
  });

  it("con un PDF de varias páginas se elige cuál y se manda a guardar", async () => {
    const { user } = abrir();
    await completarPaso1(user);
    await user.selectOptions(await screen.findByLabelText("Página del plano"), "2");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() =>
      expect(guardar).toHaveBeenCalledWith({
        edificio: "Edificio A",
        piso: "2.º piso",
        archivo: pdf,
        pagina: 2,
      }),
    );
    expect(detectar).toHaveBeenCalledWith("p1");
    expect(await screen.findByText(/Paso 2 de 4/)).toBeInTheDocument();
  });

  it("avisa que reemplaza el plano si el piso ya tiene uno", async () => {
    state.planos = [plano];
    const { user } = abrir();
    await completarPaso1(user);
    expect(
      await screen.findByText(/ya tiene plano: al continuar se reemplaza/),
    ).toBeInTheDocument();
  });

  it("sin almacenamiento muestra el aviso y no avanza", async () => {
    guardar.mockRejectedValue(new RequestError(503, "UNAVAILABLE", "faltan STORAGE_BUCKET"));
    const { user } = abrir();
    await completarPaso1(user, new File(["x"], "plano.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      await screen.findByText(
        "No se puede importar desde plano: el almacenamiento de archivos no está configurado.",
      ),
    ).toBeInTheDocument();
    expect(detectar).not.toHaveBeenCalled();
    expect(screen.getByText(/Paso 1 de 4/)).toBeInTheDocument();
  });

  it("pide edificio, piso y archivo", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Ingresá el edificio")).toBeInTheDocument();
    expect(screen.getByText("Ingresá el piso")).toBeInTheDocument();
    expect(screen.getByText("Elegí el archivo del plano")).toBeInTheDocument();
  });
});

const hastaDeteccion = async (user: ReturnType<typeof userEvent.setup>) => {
  await completarPaso1(user, new File(["x"], "plano.png", { type: "image/png" }));
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await screen.findByText(/Paso 2 de 4/);
};

describe("Importar desde plano: paso 2", () => {
  it("tilda las confiables y destilda las dudosas; tocar alterna", async () => {
    const { user } = abrir();
    await hastaDeteccion(user);
    expect(screen.getByRole("checkbox", { name: "Aula 21" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Aula 22/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Sin nombre/ })).not.toBeChecked();
    expect(screen.getAllByText("Dudosa")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Aula 22, dudosa" }));
    expect(screen.getByRole("checkbox", { name: /Aula 22/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Aula 21" }));
    expect(screen.getByRole("checkbox", { name: "Aula 21" })).not.toBeChecked();
  });

  it("sin clave, con error o sin aulas avisa y se sigue a mano", async () => {
    detectar.mockRejectedValue(new RequestError(503, "UNAVAILABLE", "falta ANTHROPIC_API_KEY"));
    const { user } = abrir();
    await hastaDeteccion(user);
    expect(screen.getByText(/detección automática no está configurada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dibujar aula" })).toBeInTheDocument();
  });

  it("avisa si el proveedor falla o no detecta aulas", async () => {
    detectar.mockResolvedValue({ aulas: [] });
    const { user } = abrir();
    await hastaDeteccion(user);
    expect(screen.getByText("No se detectaron aulas. Dibujalas a mano.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/al menos un aula/)).toBeInTheDocument();
  });

  it("dibujar un aula agrega un rectángulo tildado sin nombre", async () => {
    detectar.mockResolvedValue({ aulas: [] });
    const { user } = abrir();
    await hastaDeteccion(user);
    await user.click(screen.getByRole("button", { name: "Dibujar aula" }));
    const svg = screen.getByRole("img", { name: "Plano del piso" });
    fireEvent.pointerDown(svg, { pointerId: 1 });
    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(await screen.findByRole("checkbox", { name: /Sin nombre/ })).toBeChecked();
  });
});

describe("Importar desde plano: pasos 3 y 4", () => {
  const hastaNombres = async (user: ReturnType<typeof userEvent.setup>) => {
    await hastaDeteccion(user);
    await user.click(screen.getByRole("button", { name: "Aula 22, dudosa" }));
    await user.click(screen.getByRole("button", { name: "Sin nombre, dudosa" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText(/Paso 3 de 4/);
  };

  it("no avanza sin capacidad por defecto ni con una fila sin nombre", async () => {
    const { user } = abrir();
    await hastaNombres(user);
    expect(screen.getByLabelText("Aula 1: nombre")).toHaveValue("Aula 21");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Ingresá la capacidad por defecto")).toBeInTheDocument();
    expect(screen.getByText("Ingresá el nombre")).toBeInTheDocument();
    expect(screen.getByText(/Paso 3 de 4/)).toBeInTheDocument();
  });

  it("marca repetidos, de otro piso y dados de baja, y avisa cuáles se ubicarán", async () => {
    state.activas = [
      existente({ codigo: "Aula 22" }),
      existente({ id: "y", codigo: "Aula 77", piso: "PB" }),
    ];
    state.bajas = [existente({ id: "z", codigo: "Aula 99", activa: false })];
    const { user } = abrir();
    await hastaNombres(user);
    const nombre3 = screen.getByLabelText("Aula 3: nombre");
    await user.type(nombre3, "Aula 77");
    expect(screen.getByText("Ya existe en otro edificio o piso")).toBeInTheDocument();
    await user.clear(nombre3);
    await user.type(nombre3, "Aula 99");
    expect(screen.getByText("Está dada de baja")).toBeInTheDocument();
    await user.clear(nombre3);
    await user.type(nombre3, "Aula 21");
    expect(screen.getAllByText("Nombre repetido en el plano")).toHaveLength(2);
    await user.clear(nombre3);
    await user.type(nombre3, "Aula 23");
    expect(screen.getByText("Ya existe: se ubicará")).toBeInTheDocument();
    expect(screen.queryByText("Nombre repetido en el plano")).not.toBeInTheDocument();
  });

  it("la vista previa cuenta nuevas y ubicadas y Confirmar importa con la capacidad", async () => {
    state.activas = [existente({ codigo: "Aula 22" })];
    const onClose = vi.fn();
    const { user } = abrir(onClose);
    await hastaNombres(user);
    await user.type(screen.getByLabelText("Aula 3: nombre"), "Aula 23");
    await user.type(screen.getByLabelText("Capacidad por defecto"), "40");
    await user.type(screen.getByLabelText("Aula 1: capacidad"), "55");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("2 aulas nuevas · 1 ubicada")).toBeInTheDocument();
    expect(screen.getByText("Aula 23")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(importar).toHaveBeenCalledWith({
        capacidadPorDefecto: 40,
        aulas: [
          { codigo: "Aula 21", poligono: rectangulo(0.1), capacidad: 55 },
          { codigo: "Aula 22", poligono: rectangulo(0.3) },
          { codigo: "Aula 23", poligono: rectangulo(0.5) },
        ],
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Se cargaron 3 aulas");
    expect(onClose).toHaveBeenCalled();
  });
});
