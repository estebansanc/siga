import type { PlanoAulaDto, PlanoImagenDto } from "@repo/api/client";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanoAulas } from "@/components/aulas/plano-aulas";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ aulas: undefined as PlanoAulaDto[] | undefined }));

vi.mock("@/hooks/use-aulas", () => ({ usePlanoAulas: () => ({ data: state.aulas }) }));

const plano = (imagenUrl = "https://storage.test/plano.png?firma=1"): PlanoImagenDto => ({
  id: "plano-2",
  ancho: 1000,
  alto: 800,
  imagenUrl,
});

const poligono = (x: number) => [
  { x, y: 0.1 },
  { x: x + 0.2, y: 0.1 },
  { x: x + 0.2, y: 0.3 },
  { x, y: 0.3 },
];

const aula = (overrides: Partial<PlanoAulaDto>): PlanoAulaDto => ({
  id: "a",
  codigo: "Aula 1",
  edificio: "Edificio A",
  piso: "2.º piso",
  capacidad: 30,
  estadoAula: "DISPONIBLE",
  estado: "LIBRE",
  plano: null,
  poligono: null,
  claseEnCurso: null,
  proximaClase: null,
  ...overrides,
});

const imagenDelPlano = (contenedor: HTMLElement) => contenedor.querySelector("image")!;

beforeEach(() => {
  state.aulas = [
    aula({ id: "a21", codigo: "Aula 21", plano: plano(), poligono: poligono(0.1) }),
    aula({
      id: "a22",
      codigo: "Aula 22",
      estado: "EN_MANTENIMIENTO",
      estadoAula: "EN_MANTENIMIENTO",
      plano: plano(),
      poligono: poligono(0.5),
    }),
    aula({ id: "a28", codigo: "Aula 28" }),
    aula({ id: "pb1", codigo: "Aula PB", piso: "PB" }),
  ];
});

describe("PlanoAulas con plano de piso", () => {
  it("dibuja las aulas ubicadas sobre la imagen con código y estado, y la leyenda de los cinco", () => {
    const { container } = renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    const piso = screen.getByRole("region", { name: "2.º piso" });
    expect(imagenDelPlano(container)).toHaveAttribute(
      "href",
      "https://storage.test/plano.png?firma=1",
    );
    expect(within(piso).getByRole("button", { name: "Aula 21, Libre" })).toHaveAttribute(
      "data-estado",
      "LIBRE",
    );
    expect(within(piso).getByRole("button", { name: "Aula 22, En mantenimiento" })).toBeVisible();
    const leyenda = within(piso).getByRole("list", { name: "Estados de las aulas" });
    expect(within(leyenda).getAllByRole("listitem")).toHaveLength(5);
  });

  it("las aulas sin polígono van en Sin ubicar y abren su detalle", async () => {
    renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    const sinUbicar = screen.getByRole("region", { name: "Sin ubicar" });
    await userEvent.click(within(sinUbicar).getByRole("button", { name: /Aula 28/ }));
    expect(screen.getByRole("dialog", { name: /Aula 28/ })).toBeVisible();
  });

  it("tocar un aula del plano abre el mismo detalle, también con el teclado", async () => {
    renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    screen.getByRole("button", { name: "Aula 21, Libre" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: /Aula 21/ })).toBeVisible();
  });

  it("sin aulas sin ubicar no hay sección, y un piso sin plano conserva la grilla", () => {
    state.aulas = state.aulas?.filter((item) => item.id !== "a28");
    renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    expect(screen.queryByRole("region", { name: "Sin ubicar" })).not.toBeInTheDocument();
    const pb = screen.getByRole("region", { name: "PB" });
    expect(within(pb).getByRole("button", { name: /Aula PB/ })).toBeVisible();
    expect(pb.querySelector("svg[aria-label='Plano del piso']")).toBeNull();
  });

  it("acerca de a 50 % hasta 400 %, aleja sin bajar de 100 % y restablece", async () => {
    const { container } = renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    const svg = () => container.querySelector("svg[aria-label='Plano del piso']") as SVGElement;
    expect(svg().style.width).toBe("100%");
    expect(screen.getByRole("button", { name: "Alejar" })).toBeDisabled();
    for (let i = 0; i < 6; i++)
      await userEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(svg().style.width).toBe("400%");
    expect(screen.getByText("400 %")).toBeVisible();
    expect(screen.getByRole("button", { name: "Acercar" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Alejar" }));
    expect(svg().style.width).toBe("350%");
    await userEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(svg().style.width).toBe("100%");
  });

  it("un refresco con otra firma y un cambio de estado conserva el zoom y la imagen ya cargada", async () => {
    const { container, rerender } = renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    await userEvent.click(screen.getByRole("button", { name: "Acercar" }));
    state.aulas = state.aulas?.map((item) => {
      if (!item.plano) return item;
      const refrescada = { ...item, plano: plano("https://storage.test/plano.png?firma=2") };
      return item.id === "a21" ? { ...refrescada, estado: "OCUPADA" as const } : refrescada;
    });
    rerender(<PlanoAulas perfil="DOCENTE" />);
    expect(screen.getByText("150 %")).toBeVisible();
    expect(imagenDelPlano(container)).toHaveAttribute(
      "href",
      "https://storage.test/plano.png?firma=1",
    );
    expect(screen.getByRole("button", { name: "Aula 21, Ocupada" })).toHaveAttribute(
      "data-estado",
      "OCUPADA",
    );
  });

  it("si se reemplaza la imagen del piso (misma id, otra ruta) toma la nueva", () => {
    const { container, rerender } = renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    state.aulas = state.aulas?.map((item) =>
      item.plano
        ? { ...item, plano: plano("https://storage.test/planos/nueva.png?firma=1") }
        : item,
    );
    rerender(<PlanoAulas perfil="DOCENTE" />);
    expect(imagenDelPlano(container)).toHaveAttribute(
      "href",
      "https://storage.test/planos/nueva.png?firma=1",
    );
  });

  it("si la imagen no carga avisa y deja la grilla con todas las aulas del piso", () => {
    const { container } = renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    fireEvent.error(imagenDelPlano(container));
    expect(screen.getByText("No se pudo cargar el plano de este piso")).toBeVisible();
    const piso = screen.getByRole("region", { name: "2.º piso" });
    expect(within(piso).getAllByRole("button")).toHaveLength(3);
  });

  it("si la URL fijada vence prueba una vez con la última antes de rendirse", () => {
    const { container, rerender } = renderWithProviders(<PlanoAulas perfil="DOCENTE" />);
    state.aulas = state.aulas?.map((item) =>
      item.plano ? { ...item, plano: plano("https://storage.test/plano.png?firma=2") } : item,
    );
    rerender(<PlanoAulas perfil="DOCENTE" />);
    fireEvent.error(imagenDelPlano(container));
    expect(imagenDelPlano(container)).toHaveAttribute(
      "href",
      "https://storage.test/plano.png?firma=2",
    );
    expect(screen.queryByText("No se pudo cargar el plano de este piso")).not.toBeInTheDocument();
  });
});
