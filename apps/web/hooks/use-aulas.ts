"use client";

import type {
  AulaDetalleDto,
  AulaDto,
  AulaGestionDto,
  ClaseDto,
  ClasesSinAulaDto,
  PlanoAulaDto,
  ReemplazoAulaDto,
} from "@repo/api/client";
import type { ActualizarAula, CrearAula, ReemplazarClase } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";
import { useInvalidarResolucion } from "./use-solicitudes-aula";

export const useAulas = (bajas: boolean, enabled = true) =>
  useQuery({
    enabled,
    queryKey: queryKeys.aulas(bajas),
    queryFn: () =>
      unwrap<AulaGestionDto[]>(api.aulas.$get({ query: { bajas: bajas ? "true" : "false" } })),
    ...realtimeQueryOptions,
  });

export const usePlanoAulas = () =>
  useQuery({
    queryKey: queryKeys.aulasPlano,
    queryFn: () => unwrap<PlanoAulaDto[]>(api.aulas.plano.$get()),
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
      queryClient.invalidateQueries({ queryKey: ["incidencias"] }),
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

export const useClasesAsignables = (aulaId: string, reemplazo = false) =>
  useQuery({
    queryKey: queryKeys.clasesAsignables(aulaId, reemplazo),
    queryFn: () =>
      unwrap<ClasesSinAulaDto>(
        api.aulas[":id"]["clases-asignables"].$get({
          param: { id: aulaId },
          query: { reemplazo: reemplazo ? "true" : "false" },
        }),
      ),
    ...realtimeQueryOptions,
  });

export const useAulasDestino = (claseId: string) =>
  useQuery({
    queryKey: queryKeys.aulasDestino(claseId),
    queryFn: () => unwrap<AulaDto[]>(api.aulas.destinos.$get({ query: { claseId } })),
    enabled: Boolean(claseId),
    ...realtimeQueryOptions,
  });

export const useMoverClase = () => {
  const invalidar = useInvalidarResolucion();
  return useMutation({
    mutationFn: ({ claseId, aulaId }: { claseId: string; aulaId: string }) =>
      unwrap<ClaseDto>(
        api.clases[":id"]["mover-aula"].$post({ param: { id: claseId }, json: { aulaId } }),
      ),
    onSuccess: invalidar,
  });
};

export const useReemplazarClase = (aulaId: string) => {
  const invalidar = useInvalidarResolucion();
  return useMutation({
    mutationFn: (input: ReemplazarClase) =>
      unwrap<ReemplazoAulaDto>(
        api.aulas[":id"]["reemplazar-clase"].$post({ param: { id: aulaId }, json: input }),
      ),
    onSuccess: invalidar,
  });
};
