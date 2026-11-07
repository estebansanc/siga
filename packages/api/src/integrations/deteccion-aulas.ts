import {
  deteccionAulasSchema,
  modelosDeteccionAulas,
  type DeteccionAulas,
  type ModeloDeteccionAulas,
} from "@repo/domain";

import { apiEnv } from "../env";
import { badGateway, unavailable } from "../errors";

const endpoint = "https://api.anthropic.com/v1/messages";
const timeoutMs = 55_000;

const modelos: Record<ModeloDeteccionAulas, string> = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
};

const instrucciones = `Sos un asistente que lee planos de pisos de una facultad. Detectá solo los recintos donde se dictan clases (aulas), con o sin rótulo. No incluyas baños, pasillos, escaleras, oficinas ni salas de profesores. Para cada aula devolvé: nombre tal como figura rotulado en el plano (null si no tiene rótulo legible), confianza de 0 a 1 de que sea un aula y su contorno como polígono de 3 a 24 vértices con coordenadas relativas a la imagen (x e y entre 0 y 1, origen arriba a la izquierda). Registrá el resultado con la herramienta registrar_aulas.`;

const herramienta = {
  name: "registrar_aulas",
  description: "Registra las aulas detectadas en el plano",
  input_schema: {
    type: "object",
    properties: {
      aulas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nombre: { type: ["string", "null"] },
            confianza: { type: "number", minimum: 0, maximum: 1 },
            poligono: {
              type: "array",
              minItems: 3,
              maxItems: 24,
              items: {
                type: "object",
                properties: { x: { type: "number" }, y: { type: "number" } },
                required: ["x", "y"],
              },
            },
          },
          required: ["nombre", "confianza", "poligono"],
        },
      },
    },
    required: ["aulas"],
  },
};

const esModeloValido = (modelo: string): modelo is ModeloDeteccionAulas =>
  (modelosDeteccionAulas as readonly string[]).includes(modelo);

export const assertDeteccionConfigurada = () => {
  if (!apiEnv.deteccionAulas.anthropicApiKey) {
    throw unavailable("La detección de aulas no está configurada: falta ANTHROPIC_API_KEY");
  }
  if (!esModeloValido(apiEnv.deteccionAulas.modelo)) {
    throw unavailable(
      `La detección de aulas no está configurada: DETECCION_AULAS_MODELO debe ser ${modelosDeteccionAulas.join(", ")}`,
    );
  }
};

const modeloConfigurado = () => modelos[apiEnv.deteccionAulas.modelo as ModeloDeteccionAulas];

const pedirDeteccion = async (imagen: Uint8Array, mediaType: string): Promise<unknown> => {
  let respuesta: Response;
  try {
    respuesta = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "content-type": "application/json",
        "x-api-key": apiEnv.deteccionAulas.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modeloConfigurado(),
        max_tokens: 4096,
        system: instrucciones,
        tools: [herramienta],
        tool_choice: { type: "tool", name: herramienta.name },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: Buffer.from(imagen).toString("base64"),
                },
              },
              { type: "text", text: "Detectá las aulas de este plano." },
            ],
          },
        ],
      }),
    });
  } catch {
    throw badGateway("No se pudo contactar al servicio de detección. Cargá las aulas a mano.");
  }
  if (!respuesta.ok) {
    throw badGateway("El servicio de detección falló. Cargá las aulas a mano.");
  }
  return respuesta.json().catch(() => null);
};

type BloqueRespuesta = { type?: string; input?: unknown };

const entradaDeLaHerramienta = (cuerpo: unknown): unknown => {
  const contenido = (cuerpo as { content?: BloqueRespuesta[] } | null)?.content;
  return Array.isArray(contenido) ? contenido.find((b) => b.type === "tool_use")?.input : undefined;
};

const acotar = (valor: number) => Math.min(Math.max(valor, 0), 1);

// El modelo puede devolver coordenadas apenas fuera de la imagen o un recinto degenerado: se
// acota lo primero y se descarta lo segundo, en vez de fallar toda la detección.
const normalizar = (entrada: unknown): DeteccionAulas => {
  const aulas = (entrada as { aulas?: unknown } | undefined)?.aulas;
  if (!Array.isArray(aulas)) throw badGateway("El servicio de detección respondió algo inválido.");
  const acotadas = aulas.map((aula: Record<string, unknown>) => ({
    ...aula,
    confianza: typeof aula?.confianza === "number" ? acotar(aula.confianza) : aula?.confianza,
    poligono: Array.isArray(aula?.poligono)
      ? aula.poligono.map((p: { x?: unknown; y?: unknown }) => ({
          x: typeof p?.x === "number" ? acotar(p.x) : p?.x,
          y: typeof p?.y === "number" ? acotar(p.y) : p?.y,
        }))
      : aula?.poligono,
  }));
  const validas = acotadas.flatMap((aula) => {
    const resultado = deteccionAulasSchema.shape.aulas.element.safeParse(aula);
    return resultado.success ? [resultado.data] : [];
  });
  return { aulas: validas };
};

export const detectarAulas = async (
  imagen: Uint8Array,
  mediaType: string,
): Promise<DeteccionAulas> => {
  assertDeteccionConfigurada();
  return normalizar(entradaDeLaHerramienta(await pedirDeteccion(imagen, mediaType)));
};
