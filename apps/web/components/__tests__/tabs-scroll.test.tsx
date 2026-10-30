import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatosAcademicosSection } from "@/components/datos-academicos/datos-academicos-section";
import { renderWithProviders } from "@/test/render";

function medir(
  list: HTMLElement,
  medidas: { scrollLeft: number; clientWidth: number; scrollWidth: number },
) {
  Object.entries(medidas).forEach(([propiedad, value]) =>
    Object.defineProperty(list, propiedad, { configurable: true, value }),
  );
}

function renderTabs() {
  render(
    <Tabs defaultValue="a">
      <TabsList aria-label="Pestañas">
        <TabsTrigger value="a">Primera</TabsTrigger>
        <TabsTrigger value="b">Segunda</TabsTrigger>
      </TabsList>
    </Tabs>,
  );
  return screen.getByRole("tablist");
}

afterEach(() => vi.restoreAllMocks());

describe("TabsList con desborde horizontal", () => {
  it("no muestra desvanecido si todas las pestañas entran", () => {
    const list = renderTabs();
    medir(list, { scrollLeft: 0, clientWidth: 300, scrollWidth: 300 });
    list.dispatchEvent(new Event("scroll"));
    expect(list).not.toHaveAttribute("data-fade-start");
    expect(list).not.toHaveAttribute("data-fade-end");
    expect(list.style.maskImage).toBe("");
  });

  it("muestra desvanecido solo del lado con pestañas ocultas", async () => {
    const list = renderTabs();
    medir(list, { scrollLeft: 0, clientWidth: 200, scrollWidth: 400 });
    list.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => expect(list).toHaveAttribute("data-fade-end"));
    expect(list).not.toHaveAttribute("data-fade-start");

    medir(list, { scrollLeft: 200, clientWidth: 200, scrollWidth: 400 });
    list.dispatchEvent(new Event("scroll"));
    await vi.waitFor(() => expect(list).toHaveAttribute("data-fade-start"));
    expect(list).not.toHaveAttribute("data-fade-end");
  });

  it("elegir una pestaña la lleva a la vista", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    renderTabs();
    await userEvent.click(screen.getByRole("tab", { name: "Segunda" }));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ inline: "nearest" }));
  });
});

describe("Pestañas de las pantallas", () => {
  it("Datos académicos renderiza sus seis pestañas", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    renderWithProviders(<DatosAcademicosSection />);
    const nombres = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(nombres).toEqual([
      "Carreras",
      "Materias",
      "Períodos",
      "Comisiones",
      "Horarios",
      "Días no laborables",
    ]);
  });
});
