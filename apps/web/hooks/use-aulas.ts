"use client";

import type { AulaDetalleDto, AulaGestionDto } from "@repo/api/client";
import type { ActualizarAula, CrearAula } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";

export const useAulas = (bajas: boolean) =>
  useQuery({
    queryKey: queryKeys.aulas(bajas),
    queryFn: () =>
      unwrap<AulaGestionDto[]>(api.aulas.$get({ query: { bajas: bajas ? "true" : "false" } })),
    ...realtimeQueryOptions,
  });

export const useAula = (id: string) =>
  useQuery({
    queryKey: queryKeys.aula(id),
    queryFn: () => unwrap<AulaDetalleDto>(api.aulas[":id"].$get({ param: { id } })),
    enabled: Boolean(id),
    ...realtimeQueryOptions,
  });

// Cambiar un aula altera lo que se ofrece en Cambio de aula y las clases que la muestran.
const useInvalidarAulas = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["aulas"] }),
      queryClient.invalidateQueries({ queryKey: ["aulas-disponibles"] }),
    ]);
};

export const useCrearAula = () => {
  const invalidar = useInvalidarAulas();
  return useMutation({
    mutationFn: (input: CrearAula) => unwrap<AulaGestionDto>(api.aulas.$post({ json: input })),
    onSuccess: invalidar,
  });
};

export const useActualizarAula = (id: string) => {
  const invalidar = useInvalidarAulas();
  return useMutation({
    mutationFn: (input: ActualizarAula) =>
      unwrap<AulaGestionDto>(api.aulas[":id"].$patch({ param: { id }, json: input })),
    onSuccess: invalidar,
  });
};

export const useDarDeBajaAula = () => {
  const invalidar = useInvalidarAulas();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<AulaGestionDto>(api.aulas[":id"].baja.$post({ param: { id } })),
    onSuccess: invalidar,
  });
};

export const useReactivarAula = () => {
  const invalidar = useInvalidarAulas();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<AulaGestionDto>(api.aulas[":id"].reactivar.$post({ param: { id } })),
    onSuccess: invalidar,
  });
};
