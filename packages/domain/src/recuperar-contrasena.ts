import { z } from "zod";

import { primerErrorContrasena } from "./contrasena";
import { correoSchema } from "./usuarios";

export const mensajeContrasenasDistintas = "Las contraseñas no coinciden.";
export const mensajeEnlaceVencido = "El enlace venció o ya fue usado.";
export const mensajeRecuperacionEnviada = "Si el correo está registrado, recibirás un enlace";

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
