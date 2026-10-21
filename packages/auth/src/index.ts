export { auth, type Auth, type Session } from "./server";
export {
  getAuthContext,
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
