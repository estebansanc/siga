"use client";

import type { AvisoDto, NotificacionAvisoDto } from "@repo/api/client";
import type { CrearAviso, VistaAvisos } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";

// El aviso se ve en menos de 60 segundos (RF-14): consulta periódica como el estado.
export const useAvisos = (vista: VistaAvisos, enabled = true) =>
  useQuery({
    queryKey: queryKeys.avisosVista(vista),
    queryFn: () => unwrap<AvisoDto[]>(api.avisos.$get({ query: { vista } })),
    enabled,
    ...realtimeQueryOptions,
  });

export const usePublicarAviso = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearAviso) => unwrap<AvisoDto>(api.avisos.$post({ json: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.avisos }),
  });
};

export const useNotificacionesAviso = (id: string) =>
  useQuery({
    queryKey: queryKeys.avisoNotificaciones(id),
    queryFn: () =>
      unwrap<NotificacionAvisoDto[]>(api.avisos[":id"].notificaciones.$get({ param: { id } })),
    ...realtimeQueryOptions,
  });
