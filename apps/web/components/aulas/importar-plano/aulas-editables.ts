import type { AulaGestionDto } from "@repo/api/client";
import { capacidadAulaSchema, esAulaDudosa, type AulaDetectada, type Poligono } from "@repo/domain";

export type AulaEditable = {
  id: string;
  nombre: string;
  confianza: number | null;
  poligono: Poligono;
  tildada: boolean;
  dudosa: boolean;
  capacidad: string;
};

export const aulaDesdeDeteccion = (detectada: AulaDetectada, indice: number): AulaEditable => {
  const dudosa = esAulaDudosa(detectada);
  return {
    id: `detectada-${indice}`,
    nombre: detectada.nombre ?? "",
    confianza: detectada.confianza,
    poligono: detectada.poligono,
    tildada: !dudosa,
    dudosa,
    capacidad: "",
  };
};

export const aulaDibujada = (id: string, poligono: Poligono): AulaEditable => ({
  id,
  nombre: "",
  confianza: null,
  poligono,
  tildada: true,
  dudosa: false,
  capacidad: "",
});

export type EstadoNombre = { error: string | null; ubicara: boolean };

const sinError: EstadoNombre = { error: null, ubicara: false };

type Destino = { edificio: string; piso: string };

const evaluarNombre = (
  nombre: string,
  repetidos: Set<string>,
  existente: AulaGestionDto | undefined,
  destino: Destino,
): EstadoNombre => {
  if (!nombre) return { error: "Ingresá el nombre", ubicara: false };
  if (nombre.length > 40) return { error: "Hasta 40 caracteres", ubicara: false };
  if (repetidos.has(nombre)) return { error: "Nombre repetido en el plano", ubicara: false };
  if (!existente) return sinError;
  if (!existente.activa) return { error: "Está dada de baja", ubicara: false };
  if (existente.edificio !== destino.edificio || existente.piso !== destino.piso) {
    return { error: "Ya existe en otro edificio o piso", ubicara: false };
  }
  return { error: null, ubicara: true };
};

const nombresRepetidos = (nombres: string[]) =>
  new Set(nombres.filter((nombre, indice) => nombre && nombres.indexOf(nombre) !== indice));

export const evaluarNombres = (
  tildadas: AulaEditable[],
  existentes: AulaGestionDto[],
  destino: Destino,
): Map<string, EstadoNombre> => {
  const nombres = tildadas.map((aula) => aula.nombre.trim());
  const repetidos = nombresRepetidos(nombres);
  const porCodigo = new Map(existentes.map((aula) => [aula.codigo, aula]));
  return new Map(
    tildadas.map((aula, indice) => [
      aula.id,
      evaluarNombre(nombres[indice], repetidos, porCodigo.get(nombres[indice]), destino),
    ]),
  );
};

export const errorDeCapacidad = (valor: string, obligatoria: boolean): string | null => {
  if (!valor.trim()) return obligatoria ? "Ingresá la capacidad por defecto" : null;
  const resultado = capacidadAulaSchema.safeParse(valor);
  return resultado.success ? null : (resultado.error.issues[0]?.message ?? "Capacidad inválida");
};

export const nombreDelAula = (aula: AulaEditable) => aula.nombre.trim() || "Sin nombre";
