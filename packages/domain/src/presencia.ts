import { z } from "zod";

// RF-04 / CFG-1: la sede, el radio y la red institucional contra los que se valida la presencia
// del docente al registrar su asistencia por QR.
export const radioMetrosMax = 5000;
export const redesMax = 50;

export const latitudSchema = z
  .number({ error: "Ingresá la latitud." })
  .min(-90, "La latitud debe estar entre -90 y 90.")
  .max(90, "La latitud debe estar entre -90 y 90.");

export const longitudSchema = z
  .number({ error: "Ingresá la longitud." })
  .min(-180, "La longitud debe estar entre -180 y 180.")
  .max(180, "La longitud debe estar entre -180 y 180.");

export const radioMetrosSchema = z
  .number({ error: "Ingresá el radio en metros." })
  .int("El radio debe ser un número entero de metros.")
  .min(1, `El radio debe estar entre 1 y ${radioMetrosMax} metros.`)
  .max(radioMetrosMax, `El radio debe estar entre 1 y ${radioMetrosMax} metros.`);

const octeto = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const cidrIpv4 = new RegExp(`^(${octeto}\\.){3}${octeto}/(3[0-2]|[12]?\\d)$`);

export const redCidrSchema = z
  .string()
  .trim()
  .regex(cidrIpv4, "Cada red debe tener formato CIDR IPv4, por ejemplo 200.45.10.0/24.");

export const presenciaSchema = z.object({
  latitud: latitudSchema,
  longitud: longitudSchema,
  radioMetros: radioMetrosSchema,
  redes: z.array(redCidrSchema).max(redesMax, `Hasta ${redesMax} redes.`),
});
export type Presencia = z.infer<typeof presenciaSchema>;

// Sede de la UTN FRT (Rivadavia 1050), decisión de producto 10; red vacía hasta que el
// Administrador cargue los rangos.
export const presenciaInicial: Presencia = {
  latitud: -26.816955500941518,
  longitud: -65.19835580019078,
  radioMetros: 200,
  redes: [],
};

export const redesDesdeTexto = (texto: string) =>
  texto
    .split(/[\s,;]+/)
    .map((red) => red.trim())
    .filter(Boolean);

export type Coordenadas = { latitud: number; longitud: number };

const radioTierraMetros = 6_371_000;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

// Haversine: distancia sobre la esfera, de sobra precisa para un radio de cientos de metros.
export const distanciaMetros = (a: Coordenadas, b: Coordenadas) => {
  const deltaLatitud = aRadianes(b.latitud - a.latitud);
  const deltaLongitud = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(aRadianes(a.latitud)) *
      Math.cos(aRadianes(b.latitud)) *
      Math.sin(deltaLongitud / 2) ** 2;
  return 2 * radioTierraMetros * Math.asin(Math.sqrt(h));
};

export const ubicacionSchema = z.object({
  latitud: latitudSchema,
  longitud: longitudSchema,
  precisionMetros: z.number().min(0),
});
export type Ubicacion = z.infer<typeof ubicacionSchema>;

// La precisión peor que el radio no permite afirmar que el docente está adentro: es fallida.
export const ubicacionDentroDelRadio = (ubicacion: Ubicacion, sede: Presencia) =>
  ubicacion.precisionMetros <= sede.radioMetros &&
  distanciaMetros(ubicacion, sede) <= sede.radioMetros;

const ipv4ANumero = (ip: string) => {
  const octetos = ip.split(".").map(Number);
  if (octetos.length !== 4 || octetos.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
    return null;
  }
  return octetos.reduce((acumulado, o) => acumulado * 256 + o, 0);
};

const sinPrefijoIpv4Mapeado = (ip: string) => ip.replace(/^::ffff:/i, "");

export const ipEnRed = (ip: string, cidr: string) => {
  const direccion = ipv4ANumero(sinPrefijoIpv4Mapeado(ip.trim()));
  const [base, bitsTexto] = cidr.trim().split("/");
  const red = ipv4ANumero(base ?? "");
  const bits = Number(bitsTexto);
  if (direccion === null || red === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const tamano = 2 ** (32 - bits);
  return Math.floor(direccion / tamano) === Math.floor(red / tamano);
};

export const ipEnAlgunaRed = (ip: string, redes: readonly string[]) =>
  redes.some((red) => ipEnRed(ip, red));

export type ClaseConFranja = { inicio: Date; fin: Date };

// Con más de una clase válida se registra la que está en curso; si ninguna lo está, la próxima.
export const elegirClaseDeRegistro = <T extends ClaseConFranja>(
  clases: readonly T[],
  ahora: Date,
) => {
  const enCurso = clases.find((clase) => clase.inicio <= ahora && ahora < clase.fin);
  if (enCurso) return enCurso;
  return (
    clases
      .filter((clase) => clase.inicio > ahora)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0] ?? null
  );
};

export const intentosFallidosMax = 10;
export const ventanaIntentosMinutos = 15;
export const bloqueoIntentosMinutos = 15;

export const registroQrSchema = z.object({
  token: z.string().min(1, "El código QR está vacío."),
  ubicacion: ubicacionSchema.optional(),
});
export type RegistroQrInput = z.infer<typeof registroQrSchema>;

export const validacionPresenciaSchema = z.enum(["UBICACION", "RED"]);
export type ValidacionPresencia = z.infer<typeof validacionPresenciaSchema>;

export const validacionPresenciaLabels: Record<ValidacionPresencia, string> = {
  UBICACION: "Ubicación",
  RED: "Red institucional",
};
