import type { ClaseDto, PlanoAulaDto } from "@repo/api/client";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanoAulas } from "@/components/aulas/plano-aulas";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ aulas: undefined as PlanoAulaDto[] | undefined }));

vi.mock("@/hooks/use-aulas", () => ({ usePlanoAulas: () => ({ data: state.aulas }) }));

const clase = (overrides: Partial<ClaseDto> = {}): ClaseDto =>
  ({
    id: "c1",
    fecha: "2026-10-14",
    horaInicio: "19:00",
    horaFin: "23:00",
    estado: "PROGRAMADA",
    comision: { id: "co", codigo: "5K2", turno: "NOCHE" },
    materia: { nombre: "Proyecto Final" },
    docentes: [{ id: "d", nombre: "Marcos Álvarez" }],
    novedades: [],
    ...overrides,
  }) as ClaseDto;

const aula = (overrides: Partial<PlanoAulaDto>): PlanoAulaDto => ({
  id: "a",
  codigo: "Aula 1",
  edificio: "Edificio A",
  piso: "PB",
  capacidad: 30,
  estadoAula: "DISPONIBLE",
  estado: "LIBRE",
  claseEnCurso: null,
  proximaClase: null,
  ...overrides,
});

beforeEach(() => {
  state.aulas = [
    aula({
      id: "a12",
      codigo: "Aula 12",
      piso: "1.º piso",
      estado: "PENDIENTE",
      claseEnCurso: clase(),
    }),
    aula({
      id: "a1",
      codigo: "Aula 1",
      estado: "OCUPADA",
      claseEnCurso: clase({ estado: "DOCENTE_PRESENTE" }),
    }),
    aula({
      id: "a2",
      codigo: "Aula 2",
      estadoAula: "EN_MANTENIMIENTO",
      estado: "EN_MANTENIMIENTO",
    }),
    aula({ id: "a3", codigo: "Aula 3" }),
    aula({ id: "b5", codigo: "Aula 5", edificio: "Edificio B" }),
  ];
});

describe("PlanoAulas", () => {
  it("abre en el primer edificio y su piso más bajo, con cada aula y su estado", () => {
    renderWithProviders(<PlanoAulas />);
    const celdas = screen.getAllByRole("button", { name: /^Aula/ });
    expect(celdas.map((celda) => celda.textContent)).toEqual([
      "Aula 1Ocupada",
      "Aula 2En mantenimiento",
      "Aula 3Libre",
    ]);
    expect(screen.queryByText("Aula 12")).not.toBeInTheDocument();
  });

  it("cambia de piso y de edificio", async () => {
    renderWithProviders(<PlanoAulas />);
    await userEvent.click(screen.getByRole("button", { name: "1.º piso" }));
    expect(screen.getByRole("button", { name: /Aula 12.*Pendiente/ })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Edificio B" }));
    expect(screen.getByRole("button", { name: /Aula 5/ })).toBeVisible();
    expect(screen.queryByText("Aula 12")).not.toBeInTheDocument();
  });

  it("el pop-up de una clase en curso muestra comisión, materia, docente, franja y asistencia", async () => {
    renderWithProviders(<PlanoAulas />);
    await userEvent.click(screen.getByRole("button", { name: "1.º piso" }));
    await userEvent.click(screen.getByRole("button", { name: /Aula 12/ }));
    const dialog = screen.getByRole("dialog");
    for (const texto of [
      "5K2",
      "Proyecto Final",
      "Marcos Álvarez",
      "19:00 a 23:00",
      "Sin asistencia registrada",
      "Sin novedades activas.",
    ]) {
      expect(within(dialog).getByText(texto)).toBeVisible();
    }
  });

  it("el pop-up de un aula libre dice que lo está y la próxima clase o que no tiene más", async () => {
    state.aulas = [
      aula({
        id: "a3",
        codigo: "Aula 3",
        proximaClase: clase({ horaInicio: "21:00", horaFin: "22:00" }),
      }),
      aula({ id: "a4", codigo: "Aula 4" }),
    ];
    renderWithProviders(<PlanoAulas />);
    await userEvent.click(screen.getByRole("button", { name: /Aula 3/ }));
    expect(within(screen.getByRole("dialog")).getByText("Libre en este momento.")).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).getByText(/21:00 a 22:00 · Proyecto Final/),
    ).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /Aula 4/ }));
    expect(within(screen.getByRole("dialog")).getByText("No tiene más clases hoy")).toBeVisible();
  });

  it("el pop-up de un aula gris muestra su estado y su clase", async () => {
    state.aulas = [
      aula({ estado: "EN_MANTENIMIENTO", estadoAula: "EN_MANTENIMIENTO", claseEnCurso: clase() }),
    ];
    renderWithProviders(<PlanoAulas />);
    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("En mantenimiento")).toBeVisible();
    expect(within(dialog).getByText("Proyecto Final")).toBeVisible();
  });

  it("mantiene la elección cuando el piso queda sin aulas activas", async () => {
    const { rerender } = renderWithProviders(<PlanoAulas />);
    await userEvent.click(screen.getByRole("button", { name: "1.º piso" }));
    state.aulas = state.aulas?.filter((item) => item.piso !== "1.º piso");
    rerender(<PlanoAulas />);
    expect(screen.getByText("No hay aulas activas en este piso")).toBeVisible();
    expect(screen.getByRole("button", { name: "1.º piso" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("fija el piso inicial: si se vacía sin haberlo tocado no salta a otro", () => {
    const { rerender } = renderWithProviders(<PlanoAulas />);
    expect(screen.getByRole("button", { name: /Aula 1/ })).toBeVisible();
    state.aulas = state.aulas?.filter(
      (item) => item.piso !== "PB" || item.edificio !== "Edificio A",
    );
    rerender(<PlanoAulas />);
    expect(screen.getByText("No hay aulas activas en este piso")).toBeVisible();
    expect(screen.getByRole("button", { name: "PB" })).toHaveAttribute("aria-pressed", "true");
  });

  it("el pop-up lista las novedades activas de la clase en curso", async () => {
    state.aulas = [
      aula({
        claseEnCurso: clase({
          estado: "DEMORADA",
          novedades: [
            { id: "n1", tipo: "DEMORA", estado: "ACTIVA", minutosDemora: 15 },
          ] as ClaseDto["novedades"],
        }),
        estado: "PENDIENTE",
      }),
    ];
    renderWithProviders(<PlanoAulas />);
    await userEvent.click(screen.getByRole("button", { name: /Aula 1/ }));
    expect(within(screen.getByRole("dialog")).getByText("Demora de 15 min")).toBeVisible();
  });
});
