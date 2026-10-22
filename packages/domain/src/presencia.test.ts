import { describe, expect, it } from "vitest";

import {
  distanciaMetros,
  elegirClaseDeRegistro,
  ipEnAlgunaRed,
  ipEnRed,
  presenciaInicial,
  presenciaSchema,
  redesDesdeTexto,
  ubicacionDentroDelRadio,
} from "./presencia";

const sede = presenciaInicial;
const aca = (metrosAlNorte: number) => ({
  latitud: sede.latitud + metrosAlNorte / 111_195,
  longitud: sede.longitud,
});

describe("distanciaMetros", () => {
  it("es cero en el mismo punto", () => {
    expect(distanciaMetros(sede, sede)).toBe(0);
  });

  it("mide metros sobre un meridiano", () => {
    expect(distanciaMetros(sede, aca(150))).toBeCloseTo(150, 0);
  });

  it("coincide con una distancia conocida (Tucumán a Buenos Aires, unos 1080 km)", () => {
    const distancia = distanciaMetros(sede, { latitud: -34.6037, longitud: -58.3816 });
    expect(distancia / 1000).toBeGreaterThan(1070);
    expect(distancia / 1000).toBeLessThan(1090);
  });
});

describe("ubicacionDentroDelRadio", () => {
  it("acepta un punto dentro del radio con buena precisión", () => {
    expect(ubicacionDentroDelRadio({ ...aca(150), precisionMetros: 20 }, sede)).toBe(true);
  });

  it("rechaza un punto fuera del radio", () => {
    expect(ubicacionDentroDelRadio({ ...aca(250), precisionMetros: 20 }, sede)).toBe(false);
  });

  it("rechaza una precisión peor que el radio aunque el punto esté adentro", () => {
    expect(ubicacionDentroDelRadio({ ...aca(10), precisionMetros: 201 }, sede)).toBe(false);
  });
});

describe("ipEnRed", () => {
  it("incluye los extremos del rango", () => {
    expect(ipEnRed("200.45.10.0", "200.45.10.0/24")).toBe(true);
    expect(ipEnRed("200.45.10.255", "200.45.10.0/24")).toBe(true);
  });

  it("excluye lo que queda fuera", () => {
    expect(ipEnRed("200.45.11.1", "200.45.10.0/24")).toBe(false);
  });

  it("respeta prefijos que no son múltiplos de 8", () => {
    expect(ipEnRed("10.0.7.9", "10.0.4.0/22")).toBe(true);
    expect(ipEnRed("10.0.8.1", "10.0.4.0/22")).toBe(false);
  });

  it("/0 abarca todo y /32 una sola dirección", () => {
    expect(ipEnRed("8.8.8.8", "0.0.0.0/0")).toBe(true);
    expect(ipEnRed("8.8.8.8", "8.8.8.8/32")).toBe(true);
    expect(ipEnRed("8.8.8.9", "8.8.8.8/32")).toBe(false);
  });

  it("acepta IPv4 mapeada en IPv6 y descarta lo que no es IPv4", () => {
    expect(ipEnRed("::ffff:200.45.10.7", "200.45.10.0/24")).toBe(true);
    expect(ipEnRed("local", "200.45.10.0/24")).toBe(false);
    expect(ipEnRed("2001:db8::1", "200.45.10.0/24")).toBe(false);
  });

  it("ipEnAlgunaRed busca en todas", () => {
    expect(ipEnAlgunaRed("10.1.1.1", ["200.45.10.0/24", "10.1.0.0/16"])).toBe(true);
    expect(ipEnAlgunaRed("10.1.1.1", [])).toBe(false);
  });
});

describe("elegirClaseDeRegistro", () => {
  const hoy = (hora: string) => new Date(`2026-10-21T${hora}:00-03:00`);
  const clase = (id: string, inicio: string, fin: string) => ({
    id,
    inicio: hoy(inicio),
    fin: hoy(fin),
  });
  const clases = [clase("tarde", "21:00", "23:00"), clase("temprano", "18:00", "20:00")];

  it("elige la que está en curso", () => {
    expect(elegirClaseDeRegistro(clases, hoy("19:00"))?.id).toBe("temprano");
  });

  it("sin ninguna en curso elige la próxima", () => {
    expect(elegirClaseDeRegistro(clases, hoy("20:30"))?.id).toBe("tarde");
    expect(elegirClaseDeRegistro(clases, hoy("17:00"))?.id).toBe("temprano");
  });

  it("el fin es exclusivo", () => {
    expect(elegirClaseDeRegistro([clase("a", "18:00", "20:00")], hoy("20:00"))).toBeNull();
  });

  it("sin clases devuelve null", () => {
    expect(elegirClaseDeRegistro([], hoy("19:00"))).toBeNull();
  });
});

describe("presenciaSchema", () => {
  const valida = { ...sede, redes: ["200.45.10.0/24"] };
  const mensajes = (input: unknown) => {
    const resultado = presenciaSchema.safeParse(input);
    return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
  };

  it("acepta los valores iniciales y una red válida", () => {
    expect(presenciaSchema.safeParse(sede).success).toBe(true);
    expect(presenciaSchema.safeParse(valida).success).toBe(true);
  });

  it.each([0, -5, 5001, 1.5])("rechaza el radio %s", (radioMetros) => {
    expect(mensajes({ ...valida, radioMetros })).toHaveLength(1);
  });

  it("rechaza coordenadas fuera de rango", () => {
    expect(mensajes({ ...valida, latitud: 91 })).toEqual(["La latitud debe estar entre -90 y 90."]);
    expect(mensajes({ ...valida, longitud: -181 })).toEqual([
      "La longitud debe estar entre -180 y 180.",
    ]);
  });

  it.each(["200.45.10.0", "200.45.10.0/33", "300.1.1.0/24", "red"])("rechaza la red %s", (red) => {
    expect(mensajes({ ...valida, redes: [red] })).toEqual([
      "Cada red debe tener formato CIDR IPv4, por ejemplo 200.45.10.0/24.",
    ]);
  });
});

describe("redesDesdeTexto", () => {
  it("separa por líneas, comas y espacios y descarta vacíos", () => {
    expect(redesDesdeTexto("10.0.0.0/8\n 200.1.1.0/24, \n\n192.168.0.0/16")).toEqual([
      "10.0.0.0/8",
      "200.1.1.0/24",
      "192.168.0.0/16",
    ]);
    expect(redesDesdeTexto("  ")).toEqual([]);
  });
});
