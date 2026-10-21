"use client";

import type { ClaseDto, ClasesDelDiaDto } from "@repo/api/client";
import type { AmbitoClases } from "@repo/domain";
import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";

export type ClasesQuery = {
  ambito: AmbitoClases;
  fecha?: string;
  carreraId?: string;
  anio?: string;
  materiaId?: string;
  comisionId?: string;
};

// Sin valores vacíos: así la clave de caché y la URL solo llevan los filtros aplicados.
const compactar = (query: ClasesQuery) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value)) as ClasesQuery;

export const useClases = (query: ClasesQuery, enabled = true) => {
  const filtros = compactar(query);
  return useQuery({
    queryKey: queryKeys.clases(filtros),
    queryFn: () => unwrap<ClasesDelDiaDto>(api.clases.$get({ query: filtros })),
    enabled,
    ...realtimeQueryOptions,
  });
};

export const useClase = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.clase(id ?? ""),
    queryFn: () => unwrap<ClaseDto>(api.clases[":id"].$get({ param: { id: id ?? "" } })),
    enabled: id !== null,
    ...realtimeQueryOptions,
  });
