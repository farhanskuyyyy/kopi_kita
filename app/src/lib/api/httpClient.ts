/**
 * Thin fetch wrapper — owns base URL + Bearer auth injection + error normalization
 * (Frontend-Architecture §4). Feature adapters call this; it never imports React Query
 * and features/* never call fetch directly.
 *
 * Mock-Scenarios §6 deviation: the mock backend uses `Authorization: Bearer <token>`
 * (not the contract's cookie-based scheme) — this client attaches that header per the
 * caller-specified auth domain.
 */
import { ApiError, ForbiddenRoleError, NotFoundError, SessionExpiredError, UnreachableError } from "./ApiError";
import { getCustomerToken } from "@/features/auth/store/customerSessionStore";
import { getStaffToken } from "@/features/auth/store/staffSessionStore";
import type { ErrorEnvelope, SuccessEnvelope } from "./envelope";

const BASE_URL = "/api/v1";

export type AuthDomain = "customer" | "staff" | "none";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  domain?: AuthDomain;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
}

function buildQueryString(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function tokenFor(domain: AuthDomain): string | null {
  if (domain === "customer") return getCustomerToken();
  if (domain === "staff") return getStaffToken();
  return null;
}

function mapError(status: number, envelope: ErrorEnvelope | null): ApiError {
  const code = envelope?.error?.code ?? "UNKNOWN_ERROR";
  const message = envelope?.error?.message ?? "Something went wrong. Please try again.";
  const details = envelope?.error?.details ?? null;
  const fieldErrors = envelope?.error?.fieldErrors ?? null;

  if (code === "NOT_FOUND") return new NotFoundError(message);
  if (code === "SESSION_EXPIRED") return new SessionExpiredError(message);
  if (code === "FORBIDDEN_ROLE") return new ForbiddenRoleError(message);
  return new ApiError(status, code, message, details, fieldErrors);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, domain = "none", query } = options;
  const token = tokenFor(domain);

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${buildQueryString(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new UnreachableError();
  }

  let json: SuccessEnvelope<T> | ErrorEnvelope | null = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || !json || json.success === false) {
    throw mapError(response.status, json && json.success === false ? json : null);
  }

  return (json as SuccessEnvelope<T>).data;
}

export const httpClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
