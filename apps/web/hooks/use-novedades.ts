"use client";

import type { AulaDto, NovedadDto } from "@repo/api/client";
import type { PublicarNovedad } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";

export const useNovedades = () =>
  useQuery({
    queryKey: queryKeys.novedades,
    queryFn: () => unwrap<NovedadDto[]>(api.novedades.$get({ query: {} })),
    ...realtimeQueryOptions,
  });

const invalidarClasesYNovedades = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.novedades }),
    queryClient.invalidateQueries({ queryKey: ["clases"] }),
    queryClient.invalidateQueries({ queryKey: ["clase"] }),
  ]);

export const usePublicarNovedad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublicarNovedad) =>
      unwrap<NovedadDto>(api.novedades.$post({ json: input })),
    onSuccess: () => invalidarClasesYNovedades(queryClient),
  });
};

export const useFinalizarNovedad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<NovedadDto>(api.novedades[":id"].finalizar.$post({ param: { id } })),
    onSuccess: () => invalidarClasesYNovedades(queryClient),
  });
};

export const useAulasDisponibles = (claseIds: string[]) =>
  useQuery({
    queryKey: queryKeys.aulasDisponibles(claseIds),
    queryFn: () =>
      unwrap<AulaDto[]>(api.aulas.disponibles.$get({ query: { claseIds: claseIds.join(",") } })),
    enabled: claseIds.length > 0,
  });
