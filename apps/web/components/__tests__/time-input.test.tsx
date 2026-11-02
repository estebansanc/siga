import { TimeInput, normalizarHora } from "@repo/ui/components/time-input";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

function Controlado({
  inicial = "",
  onChange,
}: {
  inicial?: string;
  onChange: (v: string) => void;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <label htmlFor="hora">Hora</label>
      <TimeInput
        id="hora"
        value={valor}
        onChange={(siguiente) => {
          setValor(siguiente);
          onChange(siguiente);
        }}
      />
    </>
  );
}

describe("normalizarHora", () => {
  it.each([
    ["13:00", "13:00"],
    ["7:05", "07:05"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
  ])("acepta %s", (texto, esperado) => expect(normalizarHora(texto)).toBe(esperado));

  it.each(["24:00", "12:60", "1:5", "abc", "", "01:00 PM"])("rechaza %s", (texto) =>
    expect(normalizarHora(texto)).toBeNull(),
  );
});

describe("TimeInput", () => {
  it("sigue los cambios externos del valor aunque el texto ya fuera una hora válida", () => {
    const { rerender } = render(<TimeInput value="23:55" onChange={vi.fn()} aria-label="Hora" />);
    expect(screen.getByLabelText("Hora")).toHaveValue("23:55");
    rerender(<TimeInput value="" onChange={vi.fn()} aria-label="Hora" />);
    expect(screen.getByLabelText("Hora")).toHaveValue("");
  });

  it("muestra el valor en 24 horas, sin AM/PM", () => {
    render(<Controlado inicial="13:00" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Hora")).toHaveValue("13:00");
  });

  it("completa los dos puntos y emite la hora al escribirla", async () => {
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Hora"), "1830");
    expect(screen.getByLabelText("Hora")).toHaveValue("18:30");
    expect(onChange).toHaveBeenLastCalledWith("18:30");
  });

  it("emite el texto tal cual si la hora es inválida, para que el formulario la rechace", async () => {
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Hora"), "25:00");
    expect(onChange).toHaveBeenLastCalledWith("25:00");
  });

  it("se opera con teclado: abre con Enter, elige con las flechas y cierra con Escape", async () => {
    const onChange = vi.fn();
    render(<Controlado inicial="07:00" onChange={onChange} />);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Elegir hora" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const horas = await screen.findByRole("listbox", { name: "Horas" });
    expect(horas).toBeVisible();
    expect(within(horas).getByRole("option", { name: "07" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("08:00");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "Horas" })).not.toBeInTheDocument(),
    );
  });

  it("elegir los minutos cierra el selector y conserva la hora", async () => {
    const onChange = vi.fn();
    render(<Controlado inicial="13:00" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Elegir hora" }));
    await userEvent.click(await screen.findByRole("option", { name: "45" }));
    expect(onChange).toHaveBeenLastCalledWith("13:45");
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "Minutos" })).not.toBeInTheDocument(),
    );
  });
});
