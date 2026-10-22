"use client";

import type { FotoSubidaDto, IncidenciaDetalleDto, IncidenciaDto } from "@repo/api/client";
import {
  subirFotoIncidenciaSchema,
  type CambiarEstadoIncidenciaInput,
  type CrearIncidenciaInput,
  type EstadoIncidencia,
} from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, RequestError, unwrap } from "@/lib/api-client";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { queryKeys } from "@/lib/query-keys";

import { realtimeQueryOptions } from "./use-estado-institucional";

export const useIncidencias = (estados: EstadoIncidencia[]) =>
  useQuery({
    queryKey: queryKeys.incidencias(estados),
    queryFn: () =>
      unwrap<IncidenciaDto[]>(api.incidencias.$get({ query: { estados: estados.join(",") } })),
    ...realtimeQueryOptions,
  });

export const useIncidencia = (id: string) =>
  useQuery({
    queryKey: queryKeys.incidencia(id),
    queryFn: () => unwrap<IncidenciaDetalleDto>(api.incidencias[":id"].$get({ param: { id } })),
    ...realtimeQueryOptions,
  });

// Cambiar una incidencia puede cambiar el aula y lo que muestran sus listados.
const useInvalidarIncidencias = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["incidencias"] }),
      queryClient.invalidateQueries({ queryKey: ["aulas"] }),
      queryClient.invalidateQueries({ queryKey: ["aulas-disponibles"] }),
    ]);
};

const subirFoto = async (foto: File) => {
  const comprimida = await comprimirImagen(foto);
  const { key, uploadUrl } = await unwrap<FotoSubidaDto>(
    api.incidencias.fotos.$post({
      json: {
        contentType: subirFotoIncidenciaSchema.shape.contentType.parse(comprimida.type),
        size: comprimida.size,
      },
    }),
  );
  const respuesta = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": comprimida.type },
    body: comprimida,
  });
  if (!respuesta.ok) {
    throw new RequestError(respuesta.status, "UPLOAD", "No se pudo subir la foto. Probá de nuevo.");
  }
  return key;
};

export const useReportarIncidencia = () => {
  const invalidar = useInvalidarIncidencias();
  return useMutation({
    mutationFn: async ({ input, foto }: { input: CrearIncidenciaInput; foto?: File | null }) =>
      unwrap<IncidenciaDto>(
        api.incidencias.$post({
          json: { ...input, fotoKey: foto ? await subirFoto(foto) : null },
        }),
      ),
    onSuccess: invalidar,
  });
};

export const useCambiarEstadoIncidencia = (id: string) => {
  const invalidar = useInvalidarIncidencias();
  return useMutation({
    mutationFn: (input: CambiarEstadoIncidenciaInput) =>
      unwrap<IncidenciaDetalleDto>(
        api.incidencias[":id"].estado.$post({ param: { id }, json: input }),
      ),
    onSuccess: invalidar,
  });
};
