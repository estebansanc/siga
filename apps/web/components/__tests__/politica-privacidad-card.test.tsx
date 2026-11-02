import type { PoliticaPrivacidadDto } from "@repo/api/client";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PoliticaPrivacidadCard } from "@/components/politica-privacidad/politica-privacidad-card";
import { RequestError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { renderWithProviders } from "@/test/render";

const { aceptar, vigente, signOut, push, refresh } = vi.hoisted(() => ({
  aceptar: vi.fn(),
  vigente: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@repo/auth/client", () => ({ authClient: { signOut } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/hooks/use-politica-privacidad", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    politicaVigenteQuery: vigente,
    usePoliticaPrivacidad: (initialData: PoliticaPrivacidadDto) =>
      useQuery({ queryKey: ["politica-privacidad"], queryFn: vigente, initialData }),
    useAceptarPolitica: () => ({ mutateAsync: aceptar, isPending: false }),
  };
});

const politicaVigente: PoliticaPrivacidadDto = {
  version: 2,
  titulo: "Política de privacidad",
  texto:
    "1. Responsable\n\nLa UTN Facultad Regional Tucumán.\n\n2. Datos que tratamos\n\nTu nombre y tu correo.",
  publicadaEn: "2026-10-28T12:00:00.000Z",
  aceptadaEn: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue(undefined);
});

describe("PoliticaPrivacidadCard", () => {
  it("pendiente: muestra título, versión, texto completo y las dos acciones", () => {
    renderWithProviders(
      <PoliticaPrivacidadCard initialPolitica={politicaVigente} pendiente destino="/novedades" />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
    expect(screen.getByText("Versión 2")).toBeVisible();
    expect(screen.getByText("1. Responsable")).toBeVisible();
    expect(screen.getByText("Tu nombre y tu correo.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Aceptar y continuar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });

  it("aceptar registra la versión vista y vuelve a la pantalla pedida", async () => {
    aceptar.mockResolvedValue({ ...politicaVigente, aceptadaEn: "2026-10-28T15:00:00.000Z" });
    renderWithProviders(
      <PoliticaPrivacidadCard initialPolitica={politicaVigente} pendiente destino="/novedades" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Aceptar y continuar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/novedades"));
    expect(aceptar).toHaveBeenCalledWith(2);
  });

  it("si se publicó una versión nueva avisa, muestra la nueva y no continúa", async () => {
    const politicaNueva = { ...politicaVigente, version: 3, texto: "Texto nuevo." };
    aceptar.mockRejectedValue(new RequestError(409, "CONFLICT", "x"));
    vigente.mockResolvedValue(politicaNueva);
    const { queryClient } = renderWithProviders(
      <PoliticaPrivacidadCard initialPolitica={politicaVigente} pendiente destino="/" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Aceptar y continuar" }));
    expect(
      await screen.findByText(
        "Se publicó una nueva versión de la política de privacidad. Leela y aceptala para continuar.",
      ),
    ).toBeVisible();
    expect(await screen.findByText("Versión 3")).toBeVisible();
    expect(screen.getByText("Texto nuevo.")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(queryKeys.politicaPrivacidad)).toEqual(politicaNueva);
  });

  it("cerrar sesión no acepta y va al login", async () => {
    renderWithProviders(
      <PoliticaPrivacidadCard initialPolitica={politicaVigente} pendiente destino="/" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(aceptar).not.toHaveBeenCalled();
  });

  it("aceptada: modo lectura con la fecha de aceptación y sin acciones", () => {
    renderWithProviders(
      <PoliticaPrivacidadCard
        initialPolitica={{ ...politicaVigente, aceptadaEn: "2026-10-28T15:00:00.000Z" }}
        pendiente={false}
        destino="/"
      />,
    );
    expect(screen.getByText("Aceptaste esta versión el 28/10/2026")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
