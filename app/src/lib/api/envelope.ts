/**
 * Generic response-envelope shapes (STACK-STANDARDS.md wire contract). Owned by lib/api so
 * the httpClient/ApiError layer never depends on mocks/types.ts — only the envelope
 * *transport* shape is defined here; business-data shapes are Zod schemas per feature.
 */
export interface Meta {
  requestId: string;
  timestamp: string;
  durationMs: number;
  filterNotice?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorObject {
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: FieldError[] | null;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  error: null;
  meta: Meta;
}

export interface ErrorEnvelope {
  success: false;
  data: null;
  error: ErrorObject;
  meta: Meta;
}
