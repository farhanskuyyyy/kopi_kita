/**
 * Typed error hierarchy surfaced by httpClient. Frontend-Architecture §1.4/§4: a route-level
 * "not found" (NotFoundError) is a distinct shape from a reachability failure
 * (UnreachableError) — callers must not conflate the two.
 */
import type { FieldError } from "./envelope";

export class ApiError extends Error {
  code: string;
  status: number;
  details: unknown;
  fieldErrors: FieldError[] | null;

  constructor(status: number, code: string, message: string, details: unknown = null, fieldErrors: FieldError[] | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

/** Confirmed-by-backend "does not exist" — route to the 404 screen (§3.9). */
export class NotFoundError extends ApiError {
  constructor(message = "The requested resource was not found.") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

/** Session missing/expired for the relevant identity domain (§3.2). */
export class SessionExpiredError extends ApiError {
  constructor(message = "Session expired, please log in again.") {
    super(401, "SESSION_EXPIRED", message);
    this.name = "SessionExpiredError";
  }
}

/** Authenticated but wrong staff role (§3.2). */
export class ForbiddenRoleError extends ApiError {
  constructor(message = "You do not have access to this section.") {
    super(403, "FORBIDDEN_ROLE", message);
    this.name = "ForbiddenRoleError";
  }
}

/**
 * Network-level failure (mock API "down") — distinct from a confirmed 404/500 response.
 * Rendered as an inline banner + Retry, never conflated with NotFoundError (§1.4/§3.9).
 */
export class UnreachableError extends ApiError {
  constructor(message = "Couldn't reach the server. Check your connection and try again.") {
    super(0, "UNREACHABLE", message);
    this.name = "UnreachableError";
  }
}
