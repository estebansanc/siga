import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { AppVersion } from "@/components/settings/app-version";

// jsdom no implementa Web Animations; ScrollArea de base-ui lo consulta al montar.
beforeAll(() => {
  if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
});

vi.mock("@/lib/releases", async () => {
  const actual = await vi.importActual("@/lib/releases");
  const releases = [
    {
      stage: "Alpha",
      number: "0.1",
      date: "2026-09-10",
      changes: [
        "Ahora podés invitar miembros desde Configuración.",
        "Mi perfil permite cambiar el nombre.",
      ],
    },
    {
      stage: "Alpha",
      number: "0.0",
      date: "2026-09-03",
      changes: [],
    },
  ];
  return { ...actual, releases, currentRelease: releases[0] };
});

describe("AppVersion", () => {
  it("muestra la versión actual al pie", () => {
    render(<AppVersion />);
    expect(screen.getByText("Versión Alpha 0.1")).toBeInTheDocument();
  });

  it("el botón Qué hay de nuevo abre el diálogo con los cambios de la versión actual", async () => {
    render(<AppVersion />);
    await userEvent.click(screen.getByRole("button", { name: "Qué hay de nuevo" }));
    const dialog = await screen.findByRole("dialog", { name: "Qué hay de nuevo" });
    expect(within(dialog).getByRole("heading", { name: "Alpha 0.1" })).toBeVisible();
    expect(
      within(dialog).getByText("Ahora podés invitar miembros desde Configuración."),
    ).toBeVisible();
    expect(within(dialog).getByText("Mi perfil permite cambiar el nombre.")).toBeVisible();
  });

  it("las versiones anteriores aparecen colapsadas y una sin cambios lo dice al expandirla", async () => {
    render(<AppVersion />);
    await userEvent.click(screen.getByRole("button", { name: "Qué hay de nuevo" }));
    const dialog = await screen.findByRole("dialog", { name: "Qué hay de nuevo" });
    const previous = within(dialog).getByRole("button", { name: /Alpha 0\.0/ });
    expect(previous).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByText("Sin cambios registrados.")).not.toBeInTheDocument();

    await userEvent.click(previous);
    expect(previous).toHaveAttribute("aria-expanded", "true");
    expect(await within(dialog).findByText("Sin cambios registrados.")).toBeVisible();
  });
});
