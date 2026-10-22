import { fotoComprimidaMaxBytes } from "@repo/domain";

const escalas = [1, 0.75, 0.5, 0.35];
const calidades = [0.85, 0.7, 0.55, 0.4];

type Renderizar = (escala: number, calidad: number) => Promise<Blob>;

// Prueba de mayor a menor calidad y tamaño hasta que entre en el límite.
export const buscarCompresion = async (
  renderizar: Renderizar,
  maxBytes = fotoComprimidaMaxBytes,
): Promise<Blob> => {
  for (const escala of escalas) {
    for (const calidad of calidades) {
      const blob = await renderizar(escala, calidad);
      if (blob.size <= maxBytes) return blob;
    }
  }
  throw new Error("No se pudo comprimir la foto a 1 MB. Probá con otra.");
};

const renderizadorDe =
  (file: File): Renderizar =>
  async (escala, calidad) => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la foto");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la foto"))),
        "image/jpeg",
        calidad,
      ),
    );
  };

// Comprime en el dispositivo para gastar menos datos móviles; una foto que ya entra no se toca.
export const comprimirImagen = async (file: File, maxBytes = fotoComprimidaMaxBytes) =>
  file.size <= maxBytes ? file : buscarCompresion(renderizadorDe(file), maxBytes);
