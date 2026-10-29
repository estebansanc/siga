"use client";

import type { MeDto } from "@repo/api/client";
import type { SolicitarBajaInput, UpdateProfileInput } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export const useMe = (initialData?: MeDto) =>
  useQuery({
    queryKey: queryKeys.me,
    queryFn: () => unwrap<MeDto>(api.me.$get()),
    initialData,
  });

// Mismo criterio que `ownerOnly` en la API: solo el Administrador de la organización activa
// escribe Configuración.
export const isOwner = (me: MeDto | undefined) => me?.role === "owner";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => unwrap<MeDto>(api.me.$patch({ json: input })),
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.me, me);
      // El listado de miembros muestra el nombre de cada cuenta.
      void queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
};

export const useSolicitarBaja = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SolicitarBajaInput) =>
      unwrap<MeDto>(api.me["solicitud-de-baja"].$post({ json: input })),
    onSuccess: (me) => queryClient.setQueryData(queryKeys.me, me),
  });
};
