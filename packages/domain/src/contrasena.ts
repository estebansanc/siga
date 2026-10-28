import { z } from "zod";

export const mensajeContrasena = "Usá 8 caracteres o más, con letras y números";
export const politicaContrasena = "Mínimo 8 caracteres, con al menos una letra y un número.";

// Fuente única de la política: el orden es el de los mensajes (largo, letra, número).
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

// Con varias reglas incumplidas se informa solo la primera.
export const primerErrorContrasena = (value: string): string | null =>
  reglasContrasena.find((regla) => !regla.cumple(value))?.mensaje ?? null;

export const contrasenaSchema = z
  .string()
  .refine((value) => primerErrorContrasena(value) === null, mensajeContrasena);
