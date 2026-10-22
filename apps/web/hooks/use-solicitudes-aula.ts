"use client";

import type { BusquedaAulaDto, ClasesDelDiaDto, SolicitudAulaDto } from "@repo/api/client";
import type { BuscarAulaSolicitud, CrearSolicitudAulaInput } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";

export const useClasesSolicitables = (fecha: string) =>
  useQuery({
    queryKey: queryKeys.clasesSolicitables(fecha),
    queryFn: () =>
      unwrap<ClasesDelDiaDto>(api["solicitudes-aula"].clases.$get({ query: { fecha } })),
    enabled: Boolean(fecha),
    ...realtimeQueryOptions,
  });

export const useBuscarAulas = (pedido: BuscarAulaSolicitud | null) =>
  useQuery({
    queryKey: queryKeys.busquedaAulas(pedido ?? {}),
    queryFn: () =>
      pedido
        ? unwrap<BusquedaAulaDto>(
            api["solicitudes-aula"].aulas.$get({
              query: {
                claseId: pedido.claseId,
                alumnos: String(pedido.alumnos),
                recursos: pedido.recursos.join(","),
              },
            }),
          )
        : Promise.reject(new Error("Sin pedido")),
    enabled: pedido !== null,
    ...realtimeQueryOptions,
  });

export const useMisSolicitudesAula = () =>
  useQuery({
    queryKey: queryKeys.misSolicitudesAula,
    queryFn: () => unwrap<SolicitudAulaDto[]>(api["solicitudes-aula"].mias.$get()),
    ...realtimeQueryOptions,
  });

// Una solicitud Asignada cambia el aula de la clase: se refrescan sus listados.
export const useCrearSolicitudAula = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearSolicitudAulaInput) =>
      unwrap<SolicitudAulaDto>(api["solicitudes-aula"].$post({ json: input })),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["solicitudes-aula"] }),
        queryClient.invalidateQueries({ queryKey: ["clases"] }),
        queryClient.invalidateQueries({ queryKey: ["aulas"] }),
      ]),
  });
};
