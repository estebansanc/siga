import type { AuthContext } from "@repo/auth";
import { prisma, type Prisma } from "@repo/db";
import {
  compararPisos,
  planoImagenMaxBytes,
  planoTiposPermitidos,
  poligonoSchema,
  type GuardarPlano,
  type ImportarAulasPlano,
  type SubirImagenPlano,
} from "@repo/domain";

import { conflict, notFound, unprocessable } from "../errors";
import {
  assertStorageConfigured,
  createReadUrl,
  createUploadUrl,
  deleteObjects,
  getObjectInfo,
} from "../integrations/storage";
import type {
  ImagenPlanoSubidaDto,
  ImportacionPlanoDto,
  PlanoImagenDto,
  PlanoPisoDetalleDto,
  PlanoPisoDto,
} from "../schemas";

import { registrarCambioMasivo } from "./auditoria";
import { assertPerfil } from "./permisos";

const extensionPorTipo: Record<SubirImagenPlano["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const prefijoDePlanos = (organizationId: string) => `${organizationId}/planos/`;

type PlanoConImagen = { id: string; ancho: number; alto: number; imagenKey: string };

export const imagenesDePlanos = async (
  planos: PlanoConImagen[],
): Promise<Map<string, PlanoImagenDto>> => {
  const unicos = new Map(planos.map((plano) => [plano.id, plano]));
  const imagenes = await Promise.all(
    [...unicos.values()].map(async (plano): Promise<[string, PlanoImagenDto]> => [
      plano.id,
      {
        id: plano.id,
        ancho: plano.ancho,
        alto: plano.alto,
        imagenUrl: await createReadUrl(plano.imagenKey),
      },
    ]),
  );
  return new Map(imagenes);
};

type PlanoPisoRow = PlanoConImagen & { edificio: string; piso: string };

const toPlanoDto = async (plano: PlanoPisoRow, aulasUbicadas: number): Promise<PlanoPisoDto> => ({
  id: plano.id,
  edificio: plano.edificio,
  piso: plano.piso,
  ancho: plano.ancho,
  alto: plano.alto,
  imagenUrl: await createReadUrl(plano.imagenKey),
  aulasUbicadas,
});

export const crearUrlImagenPlano = async (
  auth: AuthContext,
  input: SubirImagenPlano,
): Promise<ImagenPlanoSubidaDto> => {
  await assertPerfil(auth, "BEDEL");
  assertStorageConfigured();
  const key = `${prefijoDePlanos(auth.organizationId)}${crypto.randomUUID()}.${extensionPorTipo[input.contentType]}`;
  return { key, uploadUrl: await createUploadUrl(key, input.contentType, input.size) };
};

const assertImagenSubida = async (organizationId: string, key: string) => {
  if (!key.startsWith(prefijoDePlanos(organizationId))) {
    throw unprocessable("La imagen del plano no es válida");
  }
  const info = await getObjectInfo(key);
  if (info === null) throw unprocessable("No se pudo subir la imagen del plano. Probá de nuevo.");
  const valida =
    (planoTiposPermitidos as readonly string[]).includes(info.contentType) &&
    info.size <= planoImagenMaxBytes;
  if (!valida) {
    await deleteObjects([key]);
    throw unprocessable("La imagen del plano debe ser JPG o PNG de hasta 4 MB");
  }
};

// Un piso tiene un único plano: otra imagen lo reemplaza en el mismo registro, así las aulas
// ubicadas conservan su polígono, y la imagen anterior se borra del almacenamiento.
export const guardarPlano = async (
  auth: AuthContext,
  input: GuardarPlano,
): Promise<{ plano: PlanoPisoDto; creado: boolean }> => {
  await assertPerfil(auth, "BEDEL");
  assertStorageConfigured();
  await assertImagenSubida(auth.organizationId, input.key);

  const { organizationId } = auth;
  const clave = { organizationId, edificio: input.edificio, piso: input.piso };
  const anterior = await prisma.planoPiso.findUnique({
    where: { organizationId_edificio_piso: clave },
  });
  const datos = { imagenKey: input.key, ancho: input.ancho, alto: input.alto };
  const plano = anterior
    ? await prisma.planoPiso.update({ where: { id: anterior.id }, data: datos })
    : await prisma.planoPiso.create({ data: { ...clave, ...datos } });

  if (anterior && anterior.imagenKey !== input.key) await deleteObjects([anterior.imagenKey]);
  const aulasUbicadas = await prisma.aula.count({ where: { planoId: plano.id, activa: true } });
  return { plano: await toPlanoDto(plano, aulasUbicadas), creado: !anterior };
};

export const listarPlanos = async (auth: AuthContext): Promise<PlanoPisoDto[]> => {
  await assertPerfil(auth, "BEDEL");
  const planos = await prisma.planoPiso.findMany({
    where: { organizationId: auth.organizationId },
    include: { _count: { select: { aulas: { where: { activa: true } } } } },
  });
  const ordenados = planos.sort(
    (a, b) => a.edificio.localeCompare(b.edificio, "es") || compararPisos(a.piso, b.piso),
  );
  return Promise.all(ordenados.map((plano) => toPlanoDto(plano, plano._count.aulas)));
};

const buscarPlano = async (organizationId: string, id: string) => {
  const plano = await prisma.planoPiso.findFirst({ where: { id, organizationId } });
  if (!plano) throw notFound("Plano");
  return plano;
};

export const obtenerPlano = async (auth: AuthContext, id: string): Promise<PlanoPisoDetalleDto> => {
  await assertPerfil(auth, "BEDEL");
  const plano = await buscarPlano(auth.organizationId, id);
  const aulas = await prisma.aula.findMany({
    where: { planoId: plano.id, activa: true },
    orderBy: { codigo: "asc" },
  });
  return {
    ...(await toPlanoDto(plano, aulas.length)),
    aulas: aulas.map((aula) => ({
      id: aula.id,
      codigo: aula.codigo,
      capacidad: aula.capacidad,
      poligono: poligonoSchema.parse(aula.poligono),
    })),
  };
};

const codigosEnConflicto = (
  existentes: { codigo: string; edificio: string; piso: string; activa: boolean }[],
  plano: { edificio: string; piso: string },
) =>
  existentes
    .filter((aula) => !aula.activa || aula.edificio !== plano.edificio || aula.piso !== plano.piso)
    .map((aula) => aula.codigo);

// Todo o nada: un código dado de baja o de otro edificio o piso rechaza la importación entera,
// porque mover un aula de piso afecta sus clases y horarios.
export const importarAulasDelPlano = async (
  auth: AuthContext,
  planoId: string,
  input: ImportarAulasPlano,
): Promise<ImportacionPlanoDto> => {
  await assertPerfil(auth, "BEDEL");
  const { organizationId } = auth;
  const plano = await buscarPlano(organizationId, planoId);

  return prisma.$transaction(async (tx) => {
    const existentes = await tx.aula.findMany({
      where: { organizationId, codigo: { in: input.aulas.map((aula) => aula.codigo) } },
      select: { id: true, codigo: true, edificio: true, piso: true, activa: true },
    });
    const enConflicto = codigosEnConflicto(existentes, plano);
    if (enConflicto.length > 0) {
      throw conflict(
        `No se importó nada: ${enConflicto.join(", ")} ya existe en otro edificio o piso, o está dada de baja`,
      );
    }

    const idPorCodigo = new Map(existentes.map((aula) => [aula.codigo, aula.id]));
    const nuevas = input.aulas.filter((aula) => !idPorCodigo.has(aula.codigo));
    const creadas = await tx.aula.createManyAndReturn({
      data: nuevas.map((aula) => ({
        organizationId,
        codigo: aula.codigo,
        edificio: plano.edificio,
        piso: plano.piso,
        capacidad: aula.capacidad ?? input.capacidadPorDefecto,
        equipamiento: [],
        estado: "DISPONIBLE" as const,
        planoId: plano.id,
        poligono: aula.poligono,
      })),
      select: { id: true, codigo: true },
    });

    const ubicadas = input.aulas.filter((aula) => idPorCodigo.has(aula.codigo));
    for (const aula of ubicadas) {
      await tx.aula.updateMany({
        where: { id: idPorCodigo.get(aula.codigo), organizationId },
        data: { planoId: plano.id, poligono: aula.poligono as Prisma.InputJsonValue },
      });
    }

    const resultado: ImportacionPlanoDto = {
      creadas,
      ubicadas: ubicadas.map((aula) => ({
        id: idPorCodigo.get(aula.codigo)!,
        codigo: aula.codigo,
      })),
    };
    await registrarCambioMasivo(tx, organizationId, "PlanoPiso", "plano_aulas_importadas", {
      planoId: plano.id,
      edificio: plano.edificio,
      piso: plano.piso,
      creadas: creadas.map((aula) => aula.codigo),
      ubicadas: resultado.ubicadas.map((aula) => aula.codigo),
    });
    return resultado;
  });
};
