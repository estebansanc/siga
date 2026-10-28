// Todo estado se muestra con color, icono y texto a la vez (US-8): estas clases son el color,
// compartido por los estados de clase y el indicador institucional (mockups, "Sistema visual").
export type Tono = "verde" | "amarillo" | "naranja" | "rojo" | "azul" | "gris";

export const tonoClassNames: Record<Tono, string> = {
  verde: "border-green-600/30 bg-green-50 text-green-800 dark:bg-green-950/60 dark:text-green-300",
  amarillo:
    "border-yellow-600/30 bg-yellow-50 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300",
  naranja:
    "border-orange-600/30 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  rojo: "border-red-600/30 bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  azul: "border-blue-600/30 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  gris: "border-border bg-muted text-muted-foreground",
};
