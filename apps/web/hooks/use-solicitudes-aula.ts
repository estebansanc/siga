"use client";

import type {
  BusquedaAulaDto,
  ClaseDto,
  ClasesDelDiaDto,
  ClasesSinAulaDto,
  SolicitudAulaDto,
} from "@repo/api/client";
import type {
  BusquedaAulaPedido,
  CrearSolicitudAulaInput,
  EstadoSolicitudAula,
} from "@repo/domain";
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

export const useBuscarAulas = (pedido: BusquedaAulaPedido | null) =>
  useQuery({
    queryKey: queryKeys.busquedaAulas(pedido ?? {}),
    queryFn: () =>
      pedido
        ? unwrap<BusquedaAulaDto>(
            api["solicitudes-aula"].aulas.$get({
              query: {
                claseId: pedido.claseId,
                alumnos: pedido.alumnos === undefined ? "" : String(pedido.alumnos),
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

export const useSolicitudesAula = (estados: EstadoSolicitudAula[]) =>
  useQuery({
    queryKey: queryKeys.solicitudesAula(estados),
    queryFn: () =>
      unwrap<SolicitudAulaDto[]>(
        api["solicitudes-aula"].$get({ query: { estado: estados.join(",") } }),
      ),
    enabled: estados.length > 0,
    ...realtimeQueryOptions,
  });

export const useClasesSinAula = () =>
  useQuery({
    queryKey: queryKeys.clasesSinAula,
    queryFn: () => unwrap<ClasesSinAulaDto>(api.clases["sin-aula"].$get()),
    ...realtimeQueryOptions,
  });

// Resolver una solicitud o asignar un aula cambia la clase, su ocupación y puede publicar una
// novedad: se refrescan todos esos listados.
export const useInvalidarResolucion = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [
        "solicitudes-aula",
        "clases",
        "clase",
        "aulas",
        "aulas-disponibles",
        "aulas-destino",
        "novedades",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
};

export const useAprobarSolicitudAula = () => {
  const invalidar = useInvalidarResolucion();
  return useMutation({
    mutationFn: ({ id, aulaId }: { id: string; aulaId: string }) =>
      unwrap<SolicitudAulaDto>(
        api["solicitudes-aula"][":id"].aprobar.$post({ param: { id }, json: { aulaId } }),
      ),
    onSuccess: invalidar,
  });
};

export const useReasignarSolicitudAula = () => {
  const invalidar = useInvalidarResolucion();
  return useMutation({
    mutationFn: ({ id, aulaId }: { id: string; aulaId: string }) =>
      unwrap<SolicitudAulaDto>(
        api["solicitudes-aula"][":id"].reasignar.$post({ param: { id }, json: { aulaId } }),
      ),
    onSuccess: invalidar,
  });
};

export const useRechazarSolicitudAula = () => {
  const invalidar = useInvalidarResolucion();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      unwrap<SolicitudAulaDto>(
        api["solicitudes-aula"][":id"].rechazar.$post({ param: { id }, json: { motivo } }),
      ),
    onSuccess: invalidar,
  });
};

export const useAsignarAulaAClase = () => {
  const invalidar = useInvalidarResolucion();
  return useMutation({
    mutationFn: ({ id, aulaId }: { id: string; aulaId: string }) =>
      unwrap<ClaseDto>(api.clases[":id"].aula.$post({ param: { id }, json: { aulaId } })),
    onSuccess: invalidar,
  });
};
