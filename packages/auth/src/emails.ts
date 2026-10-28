export type AuthEmailInput = { to: string; name: string; url: string };

// Los correos de la cuenta (verificación y activación) salen por la cola `EmailOutbox` de la
// API; `packages/auth` no la importa porque la API depende de este paquete, así que la API
// registra acá quién los envía.
export type AuthEmails = {
  sendVerification: (input: AuthEmailInput) => Promise<void>;
  sendActivation: (input: AuthEmailInput) => Promise<void>;
  sendPasswordReset: (input: AuthEmailInput) => Promise<void>;
};

let registered: AuthEmails | undefined;

export const configureAuthEmails = (emails: AuthEmails) => {
  registered = emails;
};

export const authEmails = (): AuthEmails => {
  if (!registered) throw new Error("Los correos de la cuenta no están configurados");
  return registered;
};
