export { auth, deactivatedAccountMessage, type Auth, type Session } from "./server";
export { configureAuthEmails, type AuthEmailInput, type AuthEmails } from "./emails";
export {
  getAuthContext,
  isAccountDeactivated,
  readAuthContext,
  requireAuthContext,
  roleOf,
  UnauthorizedError,
  type AuthContext,
  type LostOrganization,
  type MemberRole,
  type Perfil,
} from "./session";
export { APIError as AuthApiError } from "better-auth/api";
