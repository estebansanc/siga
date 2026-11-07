import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { aulaDibujada } from "@/components/aulas/importar-plano/aulas-editables";
import { LienzoPlano } from "@/components/aulas/importar-plano/lienzo-plano";

const poligono = [
  { x: 0.1, y: 0.1 },
  { x: 0.3, y: 0.1 },
  { x: 0.3, y: 0.3 },
  { x: 0.1, y: 0.3 },
];

const aula = { ...aulaDibujada("a1", poligono), nombre: "Aula 21" };

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 1000,
    height: 1000,
    right: 1000,
    bottom: 1000,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});

const lienzo = (props: Partial<Parameters<typeof LienzoPlano>[0]> = {}) => (
  <LienzoPlano imagenUrl="/plano.jpg" ancho={1000} alto={1000} aulas={[aula]} {...props} />
);

describe("LienzoPlano", () => {
  it("tocar el polígono lo alterna, también con el teclado", () => {
    const onAlternar = vi.fn();
    render(lienzo({ onAlternar }));
    const poligonoAula = screen.getByRole("button", { name: "Aula 21" });
    fireEvent.click(poligonoAula);
    fireEvent.keyDown(poligonoAula, { key: "Enter" });
    expect(onAlternar).toHaveBeenCalledTimes(2);
    expect(onAlternar).toHaveBeenCalledWith("a1");
  });

  it("arrastrar un vértice lo mueve", () => {
    const onMoverVertice = vi.fn();
    render(lienzo({ onMoverVertice, onAlternar: vi.fn() }));
    fireEvent.pointerDown(screen.getByTestId("vertice-a1-2"), { pointerId: 1 });
    fireEvent.pointerMove(screen.getByRole("img", { name: "Plano del piso" }), {
      pointerId: 1,
      clientX: 400,
      clientY: 500,
    });
    expect(onMoverVertice).toHaveBeenCalledWith("a1", 2, { x: 0.4, y: 0.5 });
  });

  it("dibujar arrastrando crea un rectángulo", () => {
    const onDibujar = vi.fn();
    render(lienzo({ dibujando: true, onDibujar }));
    const svg = screen.getByRole("img", { name: "Plano del piso" });
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 600 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 300, clientY: 800 });
    expect(onDibujar).toHaveBeenCalledWith([
      { x: 0.1, y: 0.6 },
      { x: 0.3, y: 0.6 },
      { x: 0.3, y: 0.8 },
      { x: 0.1, y: 0.8 },
    ]);
  });

  it("un toque sin arrastre crea un rectángulo por defecto", () => {
    const onDibujar = vi.fn();
    render(lienzo({ dibujando: true, onDibujar }));
    const svg = screen.getByRole("img", { name: "Plano del piso" });
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 500, clientY: 500 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 500, clientY: 500 });
    expect(onDibujar.mock.calls[0][0]).toHaveLength(4);
  });

  it("en la vista previa centra el nombre de cada aula tildada", () => {
    render(lienzo({ mostrarNombres: true }));
    const texto = screen.getByText("Aula 21");
    expect(texto).toHaveAttribute("text-anchor", "middle");
    expect(Number(texto.getAttribute("x"))).toBeCloseTo(200);
    expect(Number(texto.getAttribute("y"))).toBeCloseTo(200);
  });
});
