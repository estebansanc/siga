# ADR 012: Claude por API para detectar las aulas de un plano

**Fecha:** 2026-11-06 · **Estado:** aceptada

## Contexto

"Importar desde plano" (RF-02) carga un piso entero a partir de su plano: hay que reconocer los recintos de dictado (con o sin rótulo, sin baños, pasillos ni oficinas), leer su nombre y trazar su contorno. Un detector clásico de contornos no distingue un aula de un pasillo ni lee los rótulos; un OCR aparte tampoco resuelve lo primero. Un modelo con visión hace las dos cosas con una sola llamada.

## Decisión

**Claude (Anthropic) por HTTP**, desde `packages/api/src/integrations/deteccion-aulas.ts`, sin SDK: es una única llamada a `POST /v1/messages` con la imagen del plano ya guardada (#116) y una herramienta forzada (`registrar_aulas`) cuyo esquema obliga a devolver `nombre`, `confianza` y `poligono`. La salida se valida con zod y se normaliza (coordenadas acotadas a 0 a 1, recintos degenerados descartados). El modelo se elige con `DETECCION_AULAS_MODELO`: `haiku` por defecto, `sonnet` u `opus` (cualquier otro valor responde 503 nombrando la variable), mapeados a `claude-haiku-5-5`, `claude-sonnet-5-5` y `claude-opus-5-5`. La detección nunca crea aulas: devuelve propuestas que el Bedel revisa y confirma. Sin `ANTHROPIC_API_KEY` responde 503 y ante una falla del proveedor 502; en ambos casos el Bedel sigue a mano.

El PDF se convierte a imagen en el navegador con `pdfjs-dist` (única dependencia nueva, de `apps/web`): ni el stack ni el servidor serverless lo hacen, y así la API solo recibe JPG o PNG, como el resto de los planos.

## Consecuencias

Cada detección cuesta una llamada paga al proveedor (centavos con Haiku); solo el Bedel puede dispararla y el plano se guarda antes de analizar. La calidad varía con el plano, por eso cada aula nace tildada o "Dudosa" según su confianza y todo es editable. Cambiar de proveedor o de modelo es tocar un archivo y una variable.
