import type { EstadoInstitucionalDto } from "@repo/api/client";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CambiarEstadoForm } from "@/components/estado-institucional/cambiar-estado-form";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ estado: undefined as EstadoInstitucionalDto | undefined }));
const cambiar = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/hooks/use-estado-institucional", () => ({
  useEstadoInstitucional: () => ({ data: state.estado }),
  useCambiarEstadoInstitucional: () => ({ mutateAsync: cambiar, isPending: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  state.estado = {
    id: "e1",
    estado: "ABIERTA",
    motivo: null,
    desde: "2026-10-14T10:30:00.000Z",
    vigenciaHasta: null,
    usuario: null,
  };
  cambiar.mockResolvedValue({
    estado: { ...state.estado, estado: "CERRADA" },
    clasesSuspendidas: 2,
  });
});

describe("CambiarEstadoForm", () => {
  it("con el mismo estado que el vigente el botón queda deshabilitado y lo explica", () => {
    renderWithProviders(<CambiarEstadoForm />);
    expect(screen.getByRole("button", { name: "Cambiar estado" })).toBeDisabled();
    expect(screen.getByText("Ese ya es el estado actual.")).toBeInTheDocument();
  });

  it("Cerrada exige motivo junto al campo y cuenta los caracteres", async () => {
    renderWithProviders(<CambiarEstadoForm />);
    await userEvent.selectOptions(screen.getByLabelText("Nuevo estado"), "CERRADA");
    expect(screen.getByRole("button", { name: "Cambiar estado" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Cambiar estado" }));
    expect(await screen.findByText("Indicá el motivo")).toBeVisible();
    expect(cambiar).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Motivo/), "Paro");
    expect(screen.getByText("4 / 280")).toBeInTheDocument();
  });

  it("cerrar pide confirmación con el impacto y recién entonces registra el cambio", async () => {
    renderWithProviders(<CambiarEstadoForm />);
    await userEvent.selectOptions(screen.getByLabelText("Nuevo estado"), "CERRADA");
    await userEvent.type(screen.getByLabelText(/Motivo/), "Corte de energía");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar estado" }));
    const alert = await screen.findByRole("alertdialog", { name: "¿Cerrar la institución?" });
    expect(within(alert).getByText(/pasarán a Suspendida/)).toBeInTheDocument();
    await userEvent.click(within(alert).getByRole("button", { name: "Cerrar la institución" }));
    await waitFor(() =>
      expect(cambiar).toHaveBeenCalledWith({
        estado: "CERRADA",
        motivo: "Corte de energía",
        vigenciaHasta: null,
      }),
    );
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Estado registrado. 2 clases pasaron a Suspendida");
  });

  it("tras cerrar ofrece generar el aviso y 'Generar aviso' abre Avisos precargado sin publicar", async () => {
    cambiar.mockResolvedValue({
      estado: {
        ...state.estado,
        estado: "CERRADA",
        motivo: "Corte de energía",
        vigenciaHasta: "2026-10-15T01:30:00.000Z",
      },
      clasesSuspendidas: 0,
    });
    renderWithProviders(<CambiarEstadoForm />);
    await userEvent.selectOptions(screen.getByLabelText("Nuevo estado"), "CERRADA");
    await userEvent.type(screen.getByLabelText(/Motivo/), "Corte de energía");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar estado" }));
    const confirmacion = await screen.findByRole("alertdialog", {
      name: "¿Cerrar la institución?",
    });
    await userEvent.click(
      within(confirmacion).getByRole("button", { name: "Cerrar la institución" }),
    );

    const oferta = await screen.findByRole("alertdialog", {
      name: "¿Generar un aviso institucional?",
    });
    await userEvent.click(within(oferta).getByRole("button", { name: "Generar aviso" }));
    expect(push).toHaveBeenCalledWith(
      "/avisos?estado=CERRADA&motivo=Corte+de+energ%C3%ADa&hasta=2026-10-15T01%3A30%3A00.000Z",
    );
  });

  it("Abierta con novedades se registra directo, con la vigencia en hora argentina", async () => {
    cambiar.mockResolvedValue({
      estado: { ...state.estado, estado: "ABIERTA_CON_NOVEDADES" },
      clasesSuspendidas: 0,
    });
    renderWithProviders(<CambiarEstadoForm />);
    await userEvent.selectOptions(screen.getByLabelText("Nuevo estado"), "ABIERTA_CON_NOVEDADES");
    await userEvent.type(screen.getByLabelText(/Motivo/), "Paro de transporte");
    await userEvent.type(screen.getByLabelText(/Vigencia estimada/), "14/10/2026");
    await userEvent.type(screen.getByLabelText("Hora de la vigencia"), "23:30");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await waitFor(() =>
      expect(cambiar).toHaveBeenCalledWith({
        estado: "ABIERTA_CON_NOVEDADES",
        motivo: "Paro de transporte",
        vigenciaHasta: "2026-10-14T23:30:00-03:00",
      }),
    );
    expect(
      screen.queryByRole("alertdialog", { name: "¿Cerrar la institución?" }),
    ).not.toBeInTheDocument();
    const oferta = await screen.findByRole("alertdialog", {
      name: "¿Generar un aviso institucional?",
    });
    await userEvent.click(within(oferta).getByRole("button", { name: "Ahora no" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("al pasar a Abierta no ofrece ningún aviso", async () => {
    state.estado = { ...state.estado!, estado: "CERRADA" };
    cambiar.mockResolvedValue({
      estado: { ...state.estado, estado: "ABIERTA" },
      clasesSuspendidas: 0,
    });
    renderWithProviders(<CambiarEstadoForm />);
    await userEvent.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await waitFor(() => expect(cambiar).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
