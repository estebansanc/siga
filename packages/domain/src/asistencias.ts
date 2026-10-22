import { z } from "zod";

import { horaArgentina, horaSchema } from "./tiempo";

export const metodoAsistenciaSchema = z.enum(["QR", "MANUAL"]);
export type MetodoAsistencia = z.infer<typeof metodoAsistenciaSchema>;

export const metodoAsistenciaLabels: Record<MetodoAsistencia, string> = {
  QR: "QR",
  MANUAL: "Registro manual",
};

export const motivoRegistroManualMax = 500;

// La hora de llegada es de hoy: solo se compara la hora del día con la actual.
export const esHoraFutura = (hora: string, ahora: Date) => hora > horaArgentina(ahora);

export const registroManualSchema = z.object({
  claseId: z.string().min(1, "Elegí la clase"),
  docenteId: z.string().min(1, "Elegí el docente"),
  horaLlegada: horaSchema.refine((hora) => !esHoraFutura(hora, new Date()), {
    message: "La hora de llegada no puede ser posterior a la hora actual.",
  }),
  motivo: z
    .string()
    .trim()
    .min(1, "Ingresá el motivo del registro manual.")
    .max(motivoRegistroManualMax, "El motivo puede tener hasta 500 caracteres."),
});
export type RegistroManualInput = z.infer<typeof registroManualSchema>;
