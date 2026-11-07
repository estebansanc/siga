"use client";

import type {
  DeteccionAulasDto,
  ImagenPlanoSubidaDto,
  ImportacionPlanoDto,
  PlanoPisoDto,
} from "@repo/api/client";
import { subirImagenPlanoSchema, type ImportarAulasPlano } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, RequestError, unwrap } from "@/lib/api-client";
import { prepararImagenPlano } from "@/lib/archivo-plano";
import { queryKeys } from "@/lib/query-keys";

export const usePlanos = () =>
  useQuery({
    queryKey: queryKeys.planos,
    queryFn: () => unwrap<PlanoPisoDto[]>(api.planos.$get()),
  });

const subirImagen = async (imagen: Blob) => {
  const { key, uploadUrl } = await unwrap<ImagenPlanoSubidaDto>(
    api.planos.imagen.$post({
      json: {
        contentType: subirImagenPlanoSchema.shape.contentType.parse(imagen.type),
        size: imagen.size,
      },
    }),
  );
  const respuesta = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": imagen.type },
    body: imagen,
  });
  if (!respuesta.ok) {
    throw new RequestError(
      respuesta.status,
      "UPLOAD",
      "No se pudo subir el plano. Probá de nuevo.",
    );
  }
  return key;
};

export type GuardarPlanoInput = { edificio: string; piso: string; archivo: File; pagina: number };

export const useGuardarPlano = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ edificio, piso, archivo, pagina }: GuardarPlanoInput) => {
      const { imagen, ancho, alto } = await prepararImagenPlano(archivo, pagina);
      const key = await subirImagen(imagen);
      return unwrap<PlanoPisoDto>(api.planos.$post({ json: { edificio, piso, key, ancho, alto } }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.planos }),
  });
};

export const useDetectarAulas = () =>
  useMutation({
    mutationFn: (planoId: string) =>
      unwrap<DeteccionAulasDto>(api.planos[":id"].deteccion.$post({ param: { id: planoId } })),
  });

export const useImportarAulas = (planoId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportarAulasPlano) =>
      unwrap<ImportacionPlanoDto>(
        api.planos[":id"].aulas.$post({ param: { id: planoId }, json: input }),
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["aulas"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.planos }),
      ]),
  });
};
