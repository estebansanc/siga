import type { MeDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LostOrganizationNotice } from "@/components/layout/lost-organization-notice";
import { renderWithProviders } from "@/test/render";

const pathnameState = vi.hoisted(() => ({ current: "/" }));
const routerSpies = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/hooks/use-me", () => ({
  useMe: (initialData: MeDto) => ({ data: initialData }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.current,
  useRouter: () => routerSpies,
}));

const ownOrganization = {
  id: "org-own",
  name: "Organización de QA",
  slug: "propio",
  role: "owner" as const,
};

const meOf = (lostOrganization: MeDto["lostOrganization"]): MeDto => ({
  userId: "u1",
  userName: "Usuario QA",
  userEmail: "qa@example.com",
  dni: null,
  legajo: null,
  bajaSolicitadaEn: null,
  organizationId: ownOrganization.id,
  role: "owner",
  perfil: "BEDEL",
  organizations: [ownOrganization],
  politicaPendiente: false,
  lostOrganization,
});

const lost = { id: "org-norte", name: "Organización QA Norte" };

beforeEach(() => {
  pathnameState.current = "/";
  routerSpies.replace.mockClear();
  window.localStorage.clear();
});

describe("LostOrganizationNotice", () => {
  it("sin organización perdida no muestra nada", () => {
    renderWithProviders(<LostOrganizationNotice me={meOf(null)} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("avisa que se perdió el acceso y a quién consultar", () => {
    renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    expect(screen.getByText("Ya no tenés acceso a Organización QA Norte.")).toBeInTheDocument();
    expect(screen.getByText("Si creés que es un error, consultá en Bedelía.")).toBeInTheDocument();
  });

  it("cerrarlo lo oculta y no reaparece por esa organización", async () => {
    renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fuera del inicio navega ahí una sola vez, sin atrapar ahí las veces siguientes", () => {
    pathnameState.current = "/mi-cuenta";
    const first = renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    expect(routerSpies.replace).toHaveBeenCalledWith("/");
    expect(routerSpies.replace).toHaveBeenCalledTimes(1);
    first.unmount();

    pathnameState.current = "/configuracion";
    renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    expect(routerSpies.replace).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("ya en el inicio no navega", () => {
    renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    expect(routerSpies.replace).not.toHaveBeenCalled();
  });

  it("detectada estando ya en el inicio, queda igual marcada como aterrizada: navegar después a otra pantalla no expulsa", () => {
    const { rerender } = renderWithProviders(<LostOrganizationNotice me={meOf(lost)} />);
    expect(routerSpies.replace).not.toHaveBeenCalled();

    pathnameState.current = "/mi-cuenta";
    rerender(<LostOrganizationNotice me={meOf(lost)} />);
    expect(routerSpies.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
