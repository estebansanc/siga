"use client";

import type { CarreraDto, ComisionDto, MateriaDto } from "@repo/api/client";
import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

type FiltroMaterias = { carreraId?: string; anio?: string };
type FiltroComisiones = FiltroMaterias & { materiaId?: string };

const compactar = <T extends Record<string, string | undefined>>(query: T) =>
  Object.fromEntries(Object.entries(query).filter(([, value]) => value)) as T;

export const useCarreras = () =>
  useQuery({
    queryKey: queryKeys.carreras,
    queryFn: () => unwrap<CarreraDto[]>(api.carreras.$get()),
    staleTime: 5 * 60_000,
  });

export const useMaterias = (filtro: FiltroMaterias) => {
  const query = compactar(filtro);
  return useQuery({
    queryKey: queryKeys.materias(query),
    queryFn: () => unwrap<MateriaDto[]>(api.materias.$get({ query })),
    staleTime: 5 * 60_000,
  });
};

export const useComisiones = (filtro: FiltroComisiones, enabled = true) => {
  const query = compactar(filtro);
  return useQuery({
    queryKey: queryKeys.comisiones(query),
    queryFn: () => unwrap<ComisionDto[]>(api.comisiones.$get({ query })),
    enabled,
    staleTime: 5 * 60_000,
  });
};
