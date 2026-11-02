import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BuscarClases } from "@/components/clases/buscar-clases";
import { renderWithProviders } from "@/test/render";

vi.mock("@/hooks/use-clases", () => ({
  useClases: () => ({ data: { fecha: "2026-10-29", clases: [] } }),
}));
vi.mock("@/hooks/use-datos-academicos", () => ({
  useCarreras: () => ({ data: [] }),
  useMaterias: () => ({ data: [] }),
  useComisiones: () => ({ data: [] }),
}));
vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: undefined }),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-29T15:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("BuscarClases", () => {
  it("el encabezado va en minúscula salvo la primera letra: Jueves 29 de octubre", () => {
    renderWithProviders(<BuscarClases />);
    expect(screen.getByRole("heading", { name: "Jueves 29 de octubre" })).toBeVisible();
  });
});
