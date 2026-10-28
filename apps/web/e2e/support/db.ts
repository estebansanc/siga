import { execFileSync, execSync } from "node:child_process";
import { resolve } from "node:path";

const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgresql://app:app@localhost:5432/app_e2e";
const dbPackageDir = resolve(import.meta.dirname, "../../../../packages/db");

const runSql = (sql: string) =>
  execSync("pnpm exec prisma db execute --stdin", {
    cwd: dbPackageDir,
    env: { ...process.env, DATABASE_URL: e2eDatabaseUrl, DIRECT_URL: e2eDatabaseUrl },
    input: sql,
    stdio: ["pipe", "ignore", "inherit"],
  });

// psql no entiende parámetros como `?schema=`: solo se le pasa la conexión.
const psqlUrl = e2eDatabaseUrl.split("?")[0];

const readSql = (sql: string) =>
  execFileSync("psql", [psqlUrl, "-At", "-c", sql], { encoding: "utf8" });

// Las cuentas nuevas verifican su correo con el enlace; los tests que no ejercitan ese paso
// lo dan por verificado.
export const verificarCorreo = (email: string) =>
  runSql(`UPDATE "user" SET "emailVerified" = true WHERE email = '${email}';`);

// El primer enlace del último correo que la cola mandó a esa dirección (sin Resend en e2e los
// correos quedan en `email_outbox`).
export const enlaceDelUltimoCorreo = (email: string) => {
  const html = readSql(
    `SELECT html FROM email_outbox WHERE "to" = '${email}' ORDER BY "createdAt" DESC LIMIT 1;`,
  );
  const enlace = /href="([^"]+)"/.exec(html)?.[1];
  if (!enlace) throw new Error(`No hay correo con enlace para ${email}`);
  return enlace.replaceAll("&amp;", "&");
};

export const claseDeAsistenciaId = "e2e-clase-asistencia-qr";

const fechaArgentina = (instante: Date) =>
  new Date(instante.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

const instanteUtc = (fecha: string, hora: string) =>
  `('${fecha}T${hora}:00-03:00'::timestamptz AT TIME ZONE 'UTC')`;

export const borrarClaseDeAsistencia = () =>
  runSql(`
    DELETE FROM asistencia_docente WHERE "claseId" = '${claseDeAsistenciaId}';
    DELETE FROM clase_programada WHERE id = '${claseDeAsistenciaId}';
  `);

// Una clase de hoy del docente del seed en el Aula 7, que dura todo el día: así el test del QR
// no depende del día de la semana ni de la hora a la que corre la suite.
export const crearClaseDeAsistenciaHoy = () => {
  const fecha = fechaArgentina(new Date());
  borrarClaseDeAsistencia();
  runSql(`
    INSERT INTO clase_programada ("id", "organizationId", "comisionId", "fecha", "inicio", "fin", "aulaId", "updatedAt")
    VALUES ('${claseDeAsistenciaId}', 'utn-frt', 'comision-5k2-pf', '${fecha}',
      ${instanteUtc(fecha, "00:01")}, ${instanteUtc(fecha, "23:59")}, 'aula-7', now());
  `);
  return fecha;
};
