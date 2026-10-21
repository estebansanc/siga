"use client";

import type { CambioEstadoInstitucionalDto, EstadoInstitucionalDto } from "@repo/api/client";
import type { CambiarEstadoInstitucional } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// Tiempo real por consulta periódica (RNF-02): cada 30 s y al volver a la pestaña.
export const realtimeQueryOptions = { refetchInterval: 30_000, refetchOnWindowFocus: true };

export const useEstadoInstitucional = () =>
  useQuery({
    queryKey: queryKeys.estadoInstitucional,
    queryFn: () => unwrap<EstadoInstitucionalDto>(api["estado-institucional"].$get()),
    ...realtimeQueryOptions,
  });

export const useHistorialEstadoInstitucional = () =>
  useQuery({
    queryKey: queryKeys.estadoInstitucionalHistorial,
    queryFn: () => unwrap<EstadoInstitucionalDto[]>(api["estado-institucional"].historial.$get()),
    ...realtimeQueryOptions,
  });

export const useCambiarEstadoInstitucional = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CambiarEstadoInstitucional) =>
      unwrap<CambioEstadoInstitucionalDto>(api["estado-institucional"].$post({ json: input })),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.estadoInstitucional }),
        // Un cierre suspende clases: los listados tienen que reflejarlo.
        queryClient.invalidateQueries({ queryKey: ["clases"] }),
      ]);
    },
  });
};
