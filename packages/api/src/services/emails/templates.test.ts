import { describe, expect, it } from "vitest";

import {
  activationEmail,
  avisoEmail,
  escapeHtml,
  formatEmailDate,
  novedadEmail,
  passwordResetEmail,
  solicitudAulaEmail,
  verificationEmail,
} from "./templates";

describe("plantillas de email", () => {
  it("formatea la fecha en hora de Argentina", () => {
    expect(formatEmailDate(new Date("2026-09-22T01:00:00.000Z"))).toBe("21 de septiembre");
  });

  it("escapa el HTML de los valores", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });

  it("el correo de activación saluda por el nombre, escapado, y lleva el enlace de 24 horas", () => {
    const email = activationEmail({
      nombre: "Ana <Demo>",
      url: "https://app.test/activar-cuenta?token=t",
    });
    expect(email.subject).toBe("Activá tu cuenta de SiGA");
    expect(email.html).toContain("Hola Ana &lt;Demo&gt;");
    expect(email.html).toContain('href="https://app.test/activar-cuenta?token=t"');
    expect(email.html).toContain("El enlace vale 24 horas");
  });

  it("el correo de recuperación es genérico y lleva el enlace", () => {
    const email = passwordResetEmail({ nombre: "Ana", url: "https://app.test/reset" });
    expect(email.subject).toBe("Definí tu contraseña de SiGA");
    expect(email.html).toContain('href="https://app.test/reset"');
  });

  it("el correo de verificación lleva el enlace", () => {
    const email = verificationEmail({ nombre: "Ana", url: "https://app.test/verify" });
    expect(email.subject).toBe("Verificá tu correo en SiGA");
    expect(email.html).toContain('href="https://app.test/verify"');
  });
});

describe("correo de novedad", () => {
  const base = {
    materia: "Proyecto Final",
    comision: "5K2",
    clases: [{ fecha: "2026-10-23", horaInicio: "19:00", horaFin: "23:00" }],
    minutosDemora: null,
    enlaceVirtual: null,
    aulaNueva: null,
    mensaje: null,
    publicadaPorBedelia: false,
    clasesUrl: "https://app.test/clases",
    bajaUrl: "https://app.test/baja-correo?token=t",
  };

  it("cada tipo lleva su dato y Ausencia y Suspensión ninguno", () => {
    const datos = {
      DEMORA: ["Demora: 15 minutos", { minutosDemora: 15 }],
      VIRTUAL: [
        "Enlace de la clase: https://meet.test/x",
        { enlaceVirtual: "https://meet.test/x" },
      ],
      CAMBIO_AULA: ["Aula nueva: Aula 12", { aulaNueva: "Aula 12" }],
    } as const;
    for (const [tipo, [linea, extra]] of Object.entries(datos)) {
      const email = novedadEmail({ ...base, ...extra, tipo: tipo as keyof typeof datos });
      expect(email.html).toContain(linea);
    }
    for (const tipo of ["AUSENCIA", "SUSPENSION"] as const) {
      expect(novedadEmail({ ...base, tipo }).html).not.toMatch(
        /Demora:|Aula nueva:|Enlace de la clase:/,
      );
    }
  });

  it("asunto, fecha, mensaje escapado, autor, botón y enlace de baja", () => {
    const email = novedadEmail({
      ...base,
      tipo: "DEMORA",
      minutosDemora: 15,
      mensaje: "<b>Llego</b>",
      publicadaPorBedelia: true,
    });
    expect(email.subject).toBe("Novedad en Proyecto Final 5K2: Demora");
    expect(email.html).toContain("Fecha: 23/10/2026, 19:00 a 23:00");
    expect(email.html).toContain("Mensaje: &lt;b&gt;Llego&lt;/b&gt;");
    expect(email.html).toContain("Publicada por: Bedelía");
    expect(email.html).toContain("Ver mis clases");
    expect(email.html).toContain('href="https://app.test/baja-correo?token=t"');
    expect(email.html).toContain("Dejar de recibir novedades por correo");
  });

  it("con varias clases muestra el rango de fechas", () => {
    const email = novedadEmail({
      ...base,
      tipo: "SUSPENSION",
      clases: [
        { fecha: "2026-10-23", horaInicio: "19:00", horaFin: "23:00" },
        { fecha: "2026-10-30", horaInicio: "19:00", horaFin: "23:00" },
      ],
    });
    expect(email.html).toContain("Fechas: del 23/10/2026 al 30/10/2026");
  });

  it("el aviso lleva el asunto por prioridad, el cuerpo escapado en párrafos y la vigencia", () => {
    const base = {
      titulo: "Corte <de> luz",
      cuerpo: "Hoy no hay clases\n<b>Mañana sí</b>",
      desde: new Date("2026-10-23T13:00:00.000Z"),
      hasta: new Date("2026-10-24T02:30:00.000Z"),
      avisosUrl: "https://app.test/avisos",
      bajaUrl: "https://app.test/baja-correo?token=t",
    };
    const urgente = avisoEmail({ ...base, prioridad: "URGENTE" });
    expect(urgente.subject).toBe("Aviso urgente: Corte <de> luz");
    expect(urgente.html).toContain("Hoy no hay clases</p>");
    expect(urgente.html).toContain("&lt;b&gt;Mañana sí&lt;/b&gt;");
    expect(urgente.html).toContain("Vigente hasta");
    expect(urgente.html).toContain("Dejar de recibir avisos institucionales por correo");
    expect(avisoEmail({ ...base, prioridad: "NORMAL" }).subject).toBe(
      "Aviso institucional: Corte <de> luz",
    );
    expect(avisoEmail({ ...base, prioridad: "NORMAL", bajaUrl: null }).html).not.toContain(
      "Dejar de recibir",
    );
  });
});

describe("correo de solicitud de aula", () => {
  const base = {
    materia: "Proyecto Final",
    comision: "5K2",
    fecha: "2026-10-23",
    horaInicio: "19:00",
    horaFin: "23:00",
    aula: "Aula 3",
    aulaAnterior: null,
    motivo: null,
    url: "https://app.test/clases",
  };

  it("cada resolución lleva su asunto y sus datos", () => {
    const aprobada = solicitudAulaEmail({ ...base, resolucion: "APROBADA" });
    expect(aprobada.subject).toBe("Solicitud de aula aprobada: Proyecto Final 5K2");
    expect(aprobada.html).toContain("23/10/2026");
    expect(aprobada.html).toContain("19:00 a 23:00");
    expect(aprobada.html).toContain("Aula 3");

    const rechazada = solicitudAulaEmail({
      ...base,
      resolucion: "RECHAZADA",
      motivo: "Hay <obras>",
    });
    expect(rechazada.html).toContain("Aula pedida");
    expect(rechazada.html).toContain("Hay &lt;obras&gt;");

    const reasignada = solicitudAulaEmail({
      ...base,
      resolucion: "REASIGNADA",
      aulaAnterior: "Aula 12",
    });
    expect(reasignada.subject).toBe("Cambio de aula: Proyecto Final 5K2");
    expect(reasignada.html).toContain("Aula anterior");
    expect(reasignada.html).toContain("Aula 12");

    expect(solicitudAulaEmail({ ...base, resolucion: "ASIGNADA" }).subject).toBe(
      "Aula asignada: Proyecto Final 5K2",
    );
  });
});
