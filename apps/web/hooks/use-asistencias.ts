"use client";

import type { AsistenciaDto } from "@repo/api/client";
import type { RegistroManualInput } from "@repo/domain";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";

export const useRegistrarAsistenciaManual = () => {
  const queryClient = useQueryClient();
  const refrescarClases = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["clases"] }),
      queryClient.invalidateQueries({ queryKey: ["clase"] }),
    ]);
  return useMutation({
    mutationFn: (input: RegistroManualInput) =>
      unwrap<AsistenciaDto>(api.asistencias.manual.$post({ json: input })),
    onSettled: refrescarClases,
  });
};
