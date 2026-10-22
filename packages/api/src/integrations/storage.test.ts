import { afterEach, describe, expect, it, vi } from "vitest";

const configureStorage = () => {
  vi.stubEnv("STORAGE_ENDPOINT", "https://account.r2.cloudflarestorage.com");
  vi.stubEnv("STORAGE_BUCKET", "app-test");
  vi.stubEnv("STORAGE_ACCESS_KEY_ID", "key");
  vi.stubEnv("STORAGE_SECRET_ACCESS_KEY", "secret");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("storage", () => {
  it("falla con 503 cuando no está configurado", async () => {
    vi.stubEnv("STORAGE_ENDPOINT", "");
    const { createUploadUrl } = await import("./storage");
    await expect(createUploadUrl("k", "image/webp", 10)).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining("STORAGE_ENDPOINT"),
    });
  });

  it("firma URLs de subida y lectura contra el bucket configurado", async () => {
    configureStorage();
    const { createReadUrl, createUploadUrl } = await import("./storage");
    const upload = new URL(await createUploadUrl("org/entry/id/full.webp", "image/webp", 1234));
    expect(upload.host).toBe("account.r2.cloudflarestorage.com");
    expect(upload.pathname).toBe("/app-test/org/entry/id/full.webp");
    expect(upload.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(upload.searchParams.get("X-Amz-Signature")).toBeTruthy();

    const read = new URL(await createReadUrl("org/entry/id/thumb.webp"));
    expect(read.searchParams.get("X-Amz-Expires")).toBe("3600");
  });

  it("devuelve null cuando el objeto no se puede leer", async () => {
    configureStorage();
    const { getObject } = await import("./storage");
    expect(await getObject("org/u1/icon.png")).toBeNull();
  });
});
