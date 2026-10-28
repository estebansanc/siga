import type * as Auth from "@repo/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiBasePath, createApi } from "../app";
import { collectDeferred } from "../deferred";
import { createOrganization, resetDatabase, signInAs, type TestOrganization } from "../test/db";

// Como en producción: lo que puede esperar se junta y corre después de responder.
const deferred = collectDeferred();
const app = createApi({ defer: deferred.defer });

let organization: TestOrganization;
let headers: Record<string, string>;

const call = (path: string, init?: RequestInit) =>
  app.request(`${apiBasePath}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...headers, ...(init?.headers ?? {}) },
  });

beforeEach(async () => {
  await resetDatabase();
  await deferred.flush();
  organization = await createOrganization();
  headers = Object.fromEntries(await signInAs(organization.userId));
});

describe("respuestas rápidas: lo diferido corre después de responder", () => {
  it("toda respuesta trae Server-Timing con el total, la sesión y la base", async () => {
    const response = await call("/me");
    expect(response.status).toBe(200);
    const header = response.headers.get("Server-Timing") ?? "";
    expect(header).toMatch(/^total;dur=\d+(\.\d)?/);
    expect(header).toContain("session;dur=");
    expect(header).toContain("db;dur=");
  });
});

// El mock de sesión no aplica acá: `signInAs` crea una sesión real que `readAuthContext` lee.
vi.mock("@repo/auth", async (importOriginal) => importOriginal<typeof Auth>());
