import { z } from "zod";

import { turnoSchema, type Turno } from "./enums";
import { horaSchema, instanteArgentino } from "./tiempo";

export const turnosEnOrden: readonly Turno[] = ["MANANA", "TARDE", "NOCHE"];

export const franjaTurnoSchema = z.object({ inicio: horaSchema, fin: horaSchema });
export type FranjaTurno = z.infer<typeof franjaTurnoSchema>;

export const turnosSchema = z
  .object({
    MANANA: franjaTurnoSchema,
    TARDE: franjaTurnoSchema,
    NOCHE: franjaTurnoSchema,
  })
  .superRefine((turnos, ctx) => {
    turnosEnOrden.forEach((turno, index) => {
      const { inicio, fin } = turnos[turno];
      if (inicio >= fin) {
        ctx.addIssue({
          code: "custom",
          path: [turno, "fin"],
          message: "El fin tiene que ser posterior al inicio",
        });
      }
      const anterior = index > 0 ? turnos[turnosEnOrden[index - 1]!] : null;
      if (anterior && inicio < anterior.fin) {
        ctx.addIssue({
          code: "custom",
          path: [turno, "inicio"],
          message: "No puede empezar antes de que termine el turno anterior",
        });
      }
    });
  });
export type Turnos = z.infer<typeof turnosSchema>;

// CFG-1, decisión de producto 5: valores iniciales hasta que el Administrador los edite.
export const turnosIniciales: Turnos = {
  MANANA: { inicio: "07:00", fin: "13:00" },
  TARDE: { inicio: "13:00", fin: "18:00" },
  NOCHE: { inicio: "18:00", fin: "23:30" },
};

export const rangoDeTurno = (turnos: Turnos, turno: Turno, fecha: string) => ({
  desde: instanteArgentino(fecha, turnos[turno].inicio),
  hasta: instanteArgentino(fecha, turnos[turno].fin),
});

// Pasado el último turno se devuelve el último: explica "El turno ya terminó" en vez de dejar vacío.
export const turnoActual = (turnos: Turnos, hora: string): Turno =>
  turnosEnOrden.find((turno) => hora < turnos[turno].fin) ??
  turnosEnOrden[turnosEnOrden.length - 1]!;

export const qrVigenciaSegundos = 60;

export const generarQrSchema = z.object({
  aulaId: z.string().min(1, "Elegí un aula"),
  turno: turnoSchema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida"),
});
export type GenerarQrInput = z.infer<typeof generarQrSchema>;

export const clasesDelTurnoQuerySchema = generarQrSchema;
export type ClasesDelTurnoQuery = GenerarQrInput;
