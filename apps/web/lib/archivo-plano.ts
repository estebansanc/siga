import { planoImagenMaxBytes } from "@repo/domain";

import { buscarCompresion, comprimirImagen } from "./comprimir-imagen";

export type ImagenPlano = { imagen: Blob; ancho: number; alto: number };

const ladoMaximoPdf = 2400;

export const esPdf = (archivo: File) => archivo.type === "application/pdf";

const cargarPdf = async (archivo: File) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise;
};

export const contarPaginasDelPdf = async (archivo: File) => (await cargarPdf(archivo)).numPages;

const aJpeg = (canvas: HTMLCanvasElement, calidad: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar el plano"))),
      "image/jpeg",
      calidad,
    ),
  );

const imagenDePaginaPdf = async (archivo: File, numeroDePagina: number): Promise<ImagenPlano> => {
  const pagina = await (await cargarPdf(archivo)).getPage(numeroDePagina);
  const base = pagina.getViewport({ scale: 1 });
  const escalaBase = Math.min(ladoMaximoPdf / Math.max(base.width, base.height), 3);
  let medidas = { ancho: 0, alto: 0 };

  const imagen = await buscarCompresion(async (escala, calidad) => {
    const viewport = pagina.getViewport({ scale: escalaBase * escala });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar el plano");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvas, canvasContext: context, viewport }).promise;
    medidas = { ancho: canvas.width, alto: canvas.height };
    return aJpeg(canvas, calidad);
  }, planoImagenMaxBytes);
  return { imagen, ...medidas };
};

const imagenDeArchivo = async (archivo: File): Promise<ImagenPlano> => {
  const imagen = await comprimirImagen(archivo, planoImagenMaxBytes);
  const bitmap = await createImageBitmap(imagen);
  const medidas = { ancho: bitmap.width, alto: bitmap.height };
  bitmap.close();
  return { imagen, ...medidas };
};

// El plano se guarda siempre como JPG o PNG de hasta 4 MB (#116); un PDF se rasteriza en el navegador.
export const prepararImagenPlano = (archivo: File, pagina: number): Promise<ImagenPlano> =>
  esPdf(archivo) ? imagenDePaginaPdf(archivo, pagina) : imagenDeArchivo(archivo);
