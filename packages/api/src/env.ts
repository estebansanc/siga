const optional = (name: string) => process.env[name] ?? "";

const storageVariableNames = {
  endpoint: "STORAGE_ENDPOINT",
  bucket: "STORAGE_BUCKET",
  accessKeyId: "STORAGE_ACCESS_KEY_ID",
  secretAccessKey: "STORAGE_SECRET_ACCESS_KEY",
} as const;

export const apiEnv = {
  cronSecret: optional("CRON_SECRET"),
  authSecret: optional("BETTER_AUTH_SECRET"),
  appUrl: optional("NEXT_PUBLIC_APP_URL").replace(/\/$/, ""),
  storage: {
    endpoint: optional("STORAGE_ENDPOINT"),
    bucket: optional("STORAGE_BUCKET"),
    accessKeyId: optional("STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: optional("STORAGE_SECRET_ACCESS_KEY"),
  },
  email: {
    resendApiKey: optional("RESEND_API_KEY"),
    // Placeholder hasta verificar el dominio propio en Resend (docs/ambientes-y-deploy.md).
    from: optional("EMAIL_FROM") || "Mi Producto <no-reply@example.com>",
  },
  deteccionAulas: {
    anthropicApiKey: optional("ANTHROPIC_API_KEY"),
    modelo: optional("DETECCION_AULAS_MODELO") || "haiku",
  },
  timeZone: "America/Argentina/Buenos_Aires",
  // Una sola IP en los e2e agotaría las cuotas.
  rateLimitEnabled: process.env.RATE_LIMIT !== "off",
};

export const missingStorageVariables = () =>
  Object.entries(storageVariableNames)
    .filter(([key]) => !apiEnv.storage[key as keyof typeof apiEnv.storage])
    .map(([, name]) => name);

export const isStorageConfigured = () => missingStorageVariables().length === 0;

export const isEmailConfigured = () => Boolean(apiEnv.email.resendApiKey);
