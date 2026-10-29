"use client";

import type { DominiosPermitidosDto, UsuarioDto } from "@repo/api/client";
import type { ActualizarUsuario, CrearUsuarioInput, DominiosPermitidos } from "@repo/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type FiltroUsuarios = { q?: string; perfil?: string; bajaSolicitada?: string };

const compactar = (filtro: FiltroUsuarios) =>
  Object.fromEntries(Object.entries(filtro).filter(([, value]) => value)) as FiltroUsuarios;

export const useUsuarios = (filtro: FiltroUsuarios) => {
  const query = compactar(filtro);
  return useQuery({
    queryKey: queryKeys.usuarios(query),
    queryFn: () =>
      unwrap<UsuarioDto[]>(
        api.usuarios.$get({ query: query as Parameters<typeof api.usuarios.$get>[0]["query"] }),
      ),
  });
};

// Las comisiones de un Docente se ven también en Datos académicos y en sus clases.
const useInvalidarUsuarios = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ["usuarios", "datos-academicos", "comisiones", "clases"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
};

const useAccion = <TVariables>(accion: (variables: TVariables) => Promise<UsuarioDto>) => {
  const invalidar = useInvalidarUsuarios();
  return useMutation({ mutationFn: accion, onSuccess: invalidar });
};

export const useCrearUsuario = () =>
  useAccion((input: CrearUsuarioInput) => unwrap<UsuarioDto>(api.usuarios.$post({ json: input })));

export const useActualizarUsuario = () =>
  useAccion(({ id, input }: { id: string; input: ActualizarUsuario }) =>
    unwrap<UsuarioDto>(api.usuarios[":id"].$patch({ param: { id }, json: input })),
  );

export const useDesactivarUsuario = () =>
  useAccion((id: string) =>
    unwrap<UsuarioDto>(api.usuarios[":id"].desactivar.$post({ param: { id } })),
  );

export const useReactivarUsuario = () =>
  useAccion((id: string) =>
    unwrap<UsuarioDto>(api.usuarios[":id"].reactivar.$post({ param: { id } })),
  );

export const useReenviarActivacion = () =>
  useAccion((id: string) =>
    unwrap<UsuarioDto>(api.usuarios[":id"]["reenviar-activacion"].$post({ param: { id } })),
  );

export const useDominiosPermitidos = () =>
  useQuery({
    queryKey: queryKeys.dominiosPermitidos,
    queryFn: () => unwrap<DominiosPermitidosDto>(api.usuarios.dominios.$get()),
  });

export const useActualizarDominios = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DominiosPermitidos) =>
      unwrap<DominiosPermitidosDto>(api.usuarios.dominios.$put({ json: input })),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.dominiosPermitidos, data),
  });
};
