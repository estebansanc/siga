import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EstadoInstitucionalView } from "@/components/estado-institucional/estado-institucional-view";
import { renderWithProviders } from "@/test/render";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: undefined }),
  useHistorialEstadoInstitucional: () => ({ data: undefined }),
  useCambiarEstadoInstitucional: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("EstadoInstitucionalView", () => {
  it("el Bedel ve Estado actual, Cambiar estado e Historial, sin Avisos vigentes", () => {
    renderWithProviders(<EstadoInstitucionalView puedeCambiar />);

    expect(screen.getByText("Estado actual")).toBeInTheDocument();
    expect(screen.getAllByText("Cambiar estado").length).toBeGreaterThan(0);
    expect(screen.getByText("Historial")).toBeInTheDocument();
    expect(screen.queryByText("Avisos vigentes")).not.toBeInTheDocument();
  });

  it("los demás perfiles ven solo Estado actual e Historial", () => {
    renderWithProviders(<EstadoInstitucionalView puedeCambiar={false} />);

    expect(screen.getByText("Estado actual")).toBeInTheDocument();
    expect(screen.getByText("Historial")).toBeInTheDocument();
    expect(screen.queryByText("Cambiar estado")).not.toBeInTheDocument();
    expect(screen.queryByText("Avisos vigentes")).not.toBeInTheDocument();
  });
});
