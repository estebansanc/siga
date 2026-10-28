import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DominiosPermitidosSection } from "@/components/usuarios/dominios-permitidos-section";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ dominios: undefined as string[] | undefined }));
const actualizar = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-usuarios", () => ({
  useDominiosPermitidos: () => ({
    data: state.dominios ? { dominios: state.dominios } : undefined,
  }),
  useActualizarDominios: () => ({ mutateAsync: actualizar, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  state.dominios = ["frt.utn.edu.ar"];
  actualizar.mockImplementation((input: { dominios: string[] }) => Promise.resolve(input));
});

describe("DominiosPermitidosSection", () => {
  it("muestra los dominios cargados, uno por línea", () => {
    renderWithProviders(<DominiosPermitidosSection />);
    expect(screen.getByLabelText("Dominios")).toHaveValue("frt.utn.edu.ar");
  });

  it("guarda la lista normalizada", async () => {
    renderWithProviders(<DominiosPermitidosSection />);
    const campo = screen.getByLabelText("Dominios");
    await userEvent.clear(campo);
    await userEvent.type(campo, "@UTN.edu.ar{enter}frt.utn.edu.ar");
    await userEvent.click(screen.getByRole("button", { name: "Guardar dominios" }));
    await waitFor(() =>
      expect(actualizar).toHaveBeenCalledWith({ dominios: ["utn.edu.ar", "frt.utn.edu.ar"] }),
    );
  });

  it("vaciar la lista acepta cualquier dominio", async () => {
    renderWithProviders(<DominiosPermitidosSection />);
    await userEvent.clear(screen.getByLabelText("Dominios"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar dominios" }));
    await waitFor(() => expect(actualizar).toHaveBeenCalledWith({ dominios: [] }));
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Se acepta cualquier dominio");
  });

  it("un dominio inválido se rechaza en el campo", async () => {
    renderWithProviders(<DominiosPermitidosSection />);
    const campo = screen.getByLabelText("Dominios");
    await userEvent.clear(campo);
    await userEvent.type(campo, "frt");
    await userEvent.click(screen.getByRole("button", { name: "Guardar dominios" }));
    expect(await screen.findByText(/Ingresá un dominio válido/)).toBeVisible();
    expect(actualizar).not.toHaveBeenCalled();
  });
});
