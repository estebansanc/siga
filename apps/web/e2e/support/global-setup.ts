import { execSync } from "node:child_process";
import { resolve } from "node:path";

const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgresql://app:app@localhost:5432/app_e2e";

const dbPackageDir = resolve(import.meta.dirname, "../../../../packages/db");
const env = { ...process.env, DATABASE_URL: e2eDatabaseUrl, DIRECT_URL: e2eDatabaseUrl };

// Migra y carga el seed de SiGA: la institución (sin ella nadie puede registrarse), los
// usuarios de cada perfil y las clases del período. El seed es idempotente y deja el estado
// institucional en Abierta y sin novedades, así cada corrida arranca igual.
export default function globalSetup() {
  execSync("pnpm exec prisma migrate deploy", { cwd: dbPackageDir, env, stdio: "inherit" });
  execSync("pnpm exec prisma db seed", { cwd: dbPackageDir, env, stdio: "inherit" });
}
