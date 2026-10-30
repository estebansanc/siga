import { DateTimeInput, normalizarFecha } from "@repo/ui/components/datetime-input";
import { render, screen } from "@testing-library/react";
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
      <label htmlFor="vigencia">Vigencia</label>
      <DateTimeInput
        id="vigencia"
        horaLabel="Hora de la vigencia"
        value={valor}
        onChange={(siguiente) => {
          setValor(siguiente);
          onChange(siguiente);
        }}
      />
    </>
  );
}

describe("normalizarFecha", () => {
  it("acepta fechas reales dd/mm/aaaa", () => {
    expect(normalizarFecha("14/10/2026")).toBe("2026-10-14");
    expect(normalizarFecha("1/2/2026")).toBe("2026-02-01");
  });

  it.each(["31/02/2026", "2026-10-14", "14/13/2026", ""])("rechaza %s", (texto) =>
    expect(normalizarFecha(texto)).toBeNull(),
  );
});

describe("DateTimeInput", () => {
  it("muestra fecha dd/mm/aaaa y hora de 24 h", () => {
    render(<Controlado inicial="2026-10-14T23:30" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Vigencia")).toHaveValue("14/10/2026");
    expect(screen.getByLabelText("Hora de la vigencia")).toHaveValue("23:30");
  });

  it("emite yyyy-MM-ddTHH:mm cuando fecha y hora son válidas", async () => {
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Vigencia"), "14102026");
    await userEvent.type(screen.getByLabelText("Hora de la vigencia"), "2130");
    expect(screen.getByLabelText("Vigencia")).toHaveValue("14/10/2026");
    expect(onChange).toHaveBeenLastCalledWith("2026-10-14T21:30");
  });

  it("emite vacío cuando se borran fecha y hora", async () => {
    const onChange = vi.fn();
    render(<Controlado inicial="2026-10-14T23:30" onChange={onChange} />);
    await userEvent.clear(screen.getByLabelText("Vigencia"));
    await userEvent.clear(screen.getByLabelText("Hora de la vigencia"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("una hora inválida no produce un valor válido", async () => {
    const onChange = vi.fn();
    render(<Controlado inicial="2026-10-14T23:30" onChange={onChange} />);
    const hora = screen.getByLabelText("Hora de la vigencia");
    await userEvent.clear(hora);
    await userEvent.type(hora, "25:00");
    expect(onChange).toHaveBeenLastCalledWith("14/10/2026T25:00");
  });

  it("elegir un día en el calendario completa la fecha", async () => {
    const onChange = vi.fn();
    render(<Controlado inicial="2026-10-14T23:30" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Elegir fecha" }));
    await userEvent.click(await screen.findByRole("button", { name: /15 de octubre de 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith("2026-10-15T23:30");
  });
});
