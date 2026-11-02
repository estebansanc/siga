import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MiCuentaTabs } from "@/components/mi-cuenta/mi-cuenta-tabs";
import { renderWithProviders } from "@/test/render";

const pathname = vi.hoisted(() => ({ current: "/mi-cuenta" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = "/mi-cuenta";
});

describe("MiCuentaTabs", () => {
  it("el estudiante ve Perfil, Comisiones y Notificaciones con su dirección", () => {
    renderWithProviders(<MiCuentaTabs perfil="ESTUDIANTE" />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Perfil",
      "Comisiones",
      "Notificaciones",
    ]);
    expect(screen.getByRole("tab", { name: "Comisiones" })).toHaveAttribute(
      "href",
      "/mi-cuenta/comisiones",
    );
  });

  it.each(["DOCENTE", "BEDEL", "AUTORIDAD"] as const)(
    "%s ve solo Perfil y Notificaciones",
    (perfil) => {
      renderWithProviders(<MiCuentaTabs perfil={perfil} />);
      expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
        "Perfil",
        "Notificaciones",
      ]);
    },
  );

  it("marca como activa la pestaña de la dirección actual", () => {
    pathname.current = "/mi-cuenta/notificaciones";
    renderWithProviders(<MiCuentaTabs perfil="DOCENTE" />);
    expect(screen.getByRole("tab", { name: "Notificaciones" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
