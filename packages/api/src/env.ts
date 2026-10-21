const optional = (name: string) => process.env[name] ?? "";

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
  timeZone: "America/Argentina/Buenos_Aires",
  // Una sola IP en los e2e agotaría las cuotas.
  rateLimitEnabled: process.env.RATE_LIMIT !== "off",
};

export const isStorageConfigured = () => Object.values(apiEnv.storage).every(Boolean);

export const isEmailConfigured = () => Boolean(apiEnv.email.resendApiKey);
