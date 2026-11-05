# ADR 006: Archivos en Cloudflare R2 con URLs firmadas

**Fecha:** 2026-09-03 · **Estado:** aceptada

## Contexto

Los archivos que sube el usuario deben ocupar el mínimo espacio y cargar rápido. Guardarlos en Postgres infla la base y encarece backups.

## Decisión

Bucket privado S3-compatible en Cloudflare R2 (egreso gratis). El navegador sube directo con URLs firmadas (`packages/api/src/integrations/storage.ts`). La base guarda solo metadatos. SiGA lo usa para las fotos de las incidencias de aulas (RF-15, `POST /incidencias/fotos`): el cliente comprime la imagen a 1 MB o menos antes de subirla.

## Consecuencias

Postgres se mantiene chico. Cambiar a S3 de AWS es cambiar endpoint y credenciales. Sin `STORAGE_*` solo fallan las rutas que suben o leen archivos, con un 503 que nombra las variables que faltan.

## Actualización: imágenes de planos

Las imágenes de los planos de piso (JPG o PNG, hasta 4 MB, ticket #116) usan el mismo mecanismo: URL firmada de subida (`POST /planos/imagen`), `PUT` directo a R2 y la base guarda solo la clave (`<organización>/planos/<uuid>.jpg|png`). Al reemplazar la imagen de un piso se borra la anterior del bucket.
