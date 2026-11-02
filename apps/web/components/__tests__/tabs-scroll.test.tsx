import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AvisosSection } from "@/components/avisos/avisos-section";
import { AyudaSection } from "@/components/ayuda/ayuda-section";
import { DatosAcademicosSection } from "@/components/datos-academicos/datos-academicos-section";
import { ConsultasHistoricas } from "@/components/historico/consultas-historicas";
import { IncidenciasSection } from "@/components/incidencias/incidencias-section";
import { NovedadesSection } from "@/components/novedades/novedades-section";
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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => undefined, push: () => undefined }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

describe("TabsList: foco y pestañas agregadas", () => {
  it("las flechas mueven el foco a la pestaña vecina y la llevan a la vista", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    renderTabs();
    screen.getByRole("tab", { name: "Primera" }).focus();
    scrollIntoView.mockClear();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Segunda" })).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ inline: "nearest" }));
  });

  it("recalcula el desvanecido cuando se agrega una pestaña", async () => {
    const { rerender } = render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Pestañas">
          <TabsTrigger value="a">Primera</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    const list = screen.getByRole("tablist");
    medir(list, { scrollLeft: 0, clientWidth: 100, scrollWidth: 300 });
    act(() => {
      rerender(
        <Tabs defaultValue="a">
          <TabsList aria-label="Pestañas">
            <TabsTrigger value="a">Primera</TabsTrigger>
            <TabsTrigger value="b">Segunda</TabsTrigger>
          </TabsList>
        </Tabs>,
      );
    });
    await vi.waitFor(() => expect(list).toHaveAttribute("data-fade-end"));
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

  it.each([
    ["Avisos", <AvisosSection key="a" puedePublicar={false} />, ["Vigentes", "Historial"]],
    ["Novedades", <NovedadesSection key="n" puedePublicar={false} />, ["Activas", "Historial"]],
    [
      "Incidencias",
      <IncidenciasSection key="i" puedeGestionar={false} />,
      ["Abiertas", "Historial"],
    ],
    [
      "Consultas históricas",
      <ConsultasHistoricas key="c" perfil="AUTORIDAD" />,
      ["Asistencia docente", "Uso de aulas"],
    ],
    [
      "Ayuda",
      <AyudaSection key="y" perfil="ESTUDIANTE" role="member" />,
      ["Guía rápida", "Manual de usuario"],
    ],
  ])("%s renderiza todas sus pestañas", (_nombre, pantalla, esperadas) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    renderWithProviders(pantalla);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(esperadas);
  });
});
