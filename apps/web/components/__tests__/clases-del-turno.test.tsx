import type { ClaseDto } from "@repo/api/client";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClasesDelTurno } from "@/components/qr/clases-del-turno";
import { renderWithProviders } from "@/test/render";

const state = vi.hoisted(() => ({ data: undefined as unknown[] | undefined }));
vi.mock("@/hooks/use-qr", () => ({ useClasesDelTurno: () => ({ data: state.data }) }));

const clase = (id: string, asistencia: ClaseDto["asistencia"]) =>
  ({
    id,
    horaInicio: "19:00",
    horaFin: "23:00",
    materia: { nombre: "Proyecto Final" },
    comision: { codigo: id },
    docentes: [{ id: "d1", nombre: "Marcos Álvarez" }],
    asistencia,
  }) as unknown as ClaseDto;

const asistencia = (metodo: "QR" | "MANUAL", horaLlegada: string) =>
  ({ metodo, horaLlegada }) as NonNullable<ClaseDto["asistencia"]>;

describe("ClasesDelTurno", () => {
  it("muestra el estado de asistencia de cada clase", () => {
    state.data = [
      clase("5K2", null),
      clase("5K1", asistencia("QR", "19:10")),
      clase("5K3", asistencia("MANUAL", "19:02")),
    ];
    renderWithProviders(
      <ClasesDelTurno consulta={{ aulaId: "a1", turno: "NOCHE", fecha: "2026-10-26" }} />,
    );

    expect(screen.getByText("Sin registro")).toBeInTheDocument();
    expect(screen.getByText("QR · 19:10")).toBeInTheDocument();
    expect(screen.getByText("Registro manual · 19:02")).toBeInTheDocument();
  });

  it("muestra un esqueleto mientras carga y avisa si el aula no tiene clases", () => {
    state.data = [];
    renderWithProviders(
      <ClasesDelTurno consulta={{ aulaId: "a1", turno: "NOCHE", fecha: "2026-10-26" }} />,
    );
    expect(screen.getByText("El aula no tiene clases en el turno.")).toBeInTheDocument();
  });
});
