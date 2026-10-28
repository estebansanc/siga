"use client";

import type { DefinirContrasena, RecuperarContrasena } from "@repo/domain";
import { useMutation } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api-client";

export const useSolicitarRecuperacion = () =>
  useMutation({
    mutationFn: (input: RecuperarContrasena) =>
      unwrap<{ ok: true }>(api.cuenta["recuperar-contrasena"].$post({ json: input })),
  });

export const useDefinirContrasena = () =>
  useMutation({
    mutationFn: (input: DefinirContrasena) =>
      unwrap<{ ok: true }>(api.cuenta["definir-contrasena"].$post({ json: input })),
  });
