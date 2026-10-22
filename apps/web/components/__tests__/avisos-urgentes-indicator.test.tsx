import type { AvisoDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AvisosUrgentesIndicator } from "@/components/avisos/avisos-urgentes-indicator";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ avisos: undefined as AvisoDto[] | undefined }));
vi.mock("@/hooks/use-avisos", () => ({ useAvisos: () => ({ data: state.avisos }) }));

const aviso = (titulo: string, prioridad: AvisoDto["prioridad"]) =>
  ({ id: titulo, titulo, prioridad }) as AvisoDto;

beforeEach(() => {
  state.avisos = [];
});

describe("AvisosUrgentesIndicator", () => {
  it("sin avisos urgentes vigentes no muestra nada", () => {
    state.avisos = [aviso("Normal", "NORMAL")];
    renderWithProviders(<AvisosUrgentesIndicator />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("con uno muestra su título y lleva a Avisos", () => {
    state.avisos = [aviso("QA urgente", "URGENTE"), aviso("Normal", "NORMAL")];
    renderWithProviders(<AvisosUrgentesIndicator />);
    expect(screen.getByRole("link", { name: "Aviso urgente: QA urgente" })).toHaveAttribute(
      "href",
      "/avisos",
    );
  });

  it("con varios muestra la cantidad", () => {
    state.avisos = [aviso("A", "URGENTE"), aviso("B", "URGENTE")];
    renderWithProviders(<AvisosUrgentesIndicator />);
    expect(screen.getByRole("link", { name: "2 avisos urgentes" })).toBeInTheDocument();
  });
});
