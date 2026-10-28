import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const notFound = (entity: string) =>
  new ApiError(404, "NOT_FOUND", `${entity} no encontrado`);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);
export const unprocessable = (message: string) => new ApiError(422, "VALIDATION", message);
export const badRequest = (message: string) => new ApiError(400, "BAD_REQUEST", message);
export const forbidden = (message: string) => new ApiError(403, "FORBIDDEN", message);
export const unavailable = (message: string) => new ApiError(503, "UNAVAILABLE", message);
export const tooManyRequests = (message: string) => new ApiError(429, "RATE_LIMITED", message);

// Un dato repetido se marca en el campo que lo causa.
export const fieldConflict = (path: string, message: string) =>
  new ApiError(409, "CONFLICT", message, [{ path, message }]);
