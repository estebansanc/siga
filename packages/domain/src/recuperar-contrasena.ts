import { z } from "zod";

import { correoSchema } from "./usuarios";

export const politicaContrasena = "Mínimo 8 caracteres, con al menos una letra y un número.";
export const mensajeContrasenasDistintas = "Las contraseñas no coinciden.";
export const mensajeEnlaceVencido = "El enlace venció o ya fue usado.";
export const mensajeRecuperacionEnviada = "Si el correo está registrado, recibirás un enlace";

const reglasContrasena = [
  {
    cumple: (value: string) => value.length >= 8,
    mensaje: "La contraseña debe tener al menos 8 caracteres.",
  },
  {
    cumple: (value: string) => /[A-Za-z]/.test(value),
    mensaje: "La contraseña debe incluir al menos una letra.",
  },
  {
    cumple: (value: string) => /\d/.test(value),
    mensaje: "La contraseña debe incluir al menos un número.",
  },
];

// Con varias reglas incumplidas se informa solo la primera (largo, letra, número).
export const primerErrorContrasena = (value: string): string | null =>
  reglasContrasena.find((regla) => !regla.cumple(value))?.mensaje ?? null;

export const recuperarContrasenaSchema = z.object({ correo: correoSchema });
export type RecuperarContrasena = z.infer<typeof recuperarContrasenaSchema>;

export const definirContrasenaSchema = z
  .object({
    token: z.string().min(1, mensajeEnlaceVencido),
    contrasena: z.string(),
    confirmacion: z.string(),
  })
  .superRefine((value, ctx) => {
    const error = primerErrorContrasena(value.contrasena);
    if (error) ctx.addIssue({ code: "custom", path: ["contrasena"], message: error });
    else if (value.contrasena !== value.confirmacion) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmacion"],
        message: mensajeContrasenasDistintas,
      });
    }
  });
export type DefinirContrasena = z.infer<typeof definirContrasenaSchema>;
