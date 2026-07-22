/**
 * Deterministic failure/edge-scenario toggles for the mock backend.
 *
 * Kept decoupled from UI: scenarios are triggered either
 *   (a) globally, via the exported `scenarios` object (e.g. from a browser devtools
 *       console, or a hidden QA panel Stage 6 may wire up), or
 *   (b) per-request, via the `x-mock-scenario` request header or a `_scenario` query
 *       string param — so a Playwright/QA test can force one specific call to fail
 *       without flipping global state for the whole session.
 *
 * `handlers.ts` is the only module that reads from here (plus `browser.ts`, which does
 * not need to). No UI code should import this directly except an optional Stage-6/8 QA
 * harness — see Mock-Scenarios.md for the documented trigger list.
 */

export type PerRequestScenario =
  | "force-500"
  | "force-payment-failed"
  | "force-stock-unavailable"
  | "force-network-error"
  | "none";

interface ScenarioState {
  /** Force every mocked endpoint to return 500 SERVER_ERROR. */
  forceServerError: boolean;
  /** Force /checkout/payment/validate and /orders (create) to behave as a declined payment. */
  forcePaymentFailed: boolean;
  /** Force /cart/validate, /orders (create), and reorder to report every line unavailable. */
  forceStockUnavailable: boolean;
  /** Artificial latency applied to every handler, in addition to per-request override. */
  latencyEnabled: boolean;
  latencyMinMs: number;
  latencyMaxMs: number;
}

const defaultState: ScenarioState = {
  forceServerError: false,
  forcePaymentFailed: false,
  forceStockUnavailable: false,
  latencyEnabled: true,
  latencyMinMs: 150,
  latencyMaxMs: 500,
};

let state: ScenarioState = { ...defaultState };

export const scenarios = {
  /** Reset every global toggle back to defaults (light latency on, no forced failures). */
  reset(): void {
    state = { ...defaultState };
  },
  forceServerError(on = true): void {
    state.forceServerError = on;
  },
  forcePaymentFailed(on = true): void {
    state.forcePaymentFailed = on;
  },
  forceStockUnavailable(on = true): void {
    state.forceStockUnavailable = on;
  },
  setLatency(minMs: number, maxMs: number): void {
    state.latencyEnabled = true;
    state.latencyMinMs = Math.max(0, minMs);
    state.latencyMaxMs = Math.max(state.latencyMinMs, maxMs);
  },
  disableLatency(): void {
    state.latencyEnabled = false;
  },
  enableLatency(): void {
    state.latencyEnabled = true;
  },
  getState(): Readonly<ScenarioState> {
    return state;
  },
};

// Expose on window in dev so a QA panel / manual console trigger can flip scenarios
// without a code change (e.g. `window.__mockScenarios.forceServerError()`).
declare global {
  interface Window {
    __mockScenarios?: typeof scenarios;
  }
}
if (typeof window !== "undefined") {
  window.__mockScenarios = scenarios;
}

// ---------------------------------------------------------------------------
// Per-request overrides
// ---------------------------------------------------------------------------

export function getRequestScenario(request: Request): PerRequestScenario {
  const header = request.headers.get("x-mock-scenario");
  if (header) return header as PerRequestScenario;
  const url = new URL(request.url);
  const param = url.searchParams.get("_scenario");
  return (param as PerRequestScenario) ?? "none";
}

/** Per-request latency override, e.g. `x-mock-latency: 3000` or `?_latencyMs=3000`. */
function getRequestLatencyOverrideMs(request: Request): number | null {
  const header = request.headers.get("x-mock-latency");
  if (header && !Number.isNaN(Number(header))) return Number(header);
  const url = new URL(request.url);
  const param = url.searchParams.get("_latencyMs");
  if (param && !Number.isNaN(Number(param))) return Number(param);
  return null;
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/** Applies artificial latency for realism (Frontend-Architecture §5 "feel real"). */
export async function applyLatency(request: Request): Promise<void> {
  const override = getRequestLatencyOverrideMs(request);
  if (override !== null) {
    await new Promise((resolve) => setTimeout(resolve, override));
    return;
  }
  if (!state.latencyEnabled) return;
  const ms = randomBetween(state.latencyMinMs, state.latencyMaxMs);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** True if this request (globally or per-request) should be forced to a 500. */
export function shouldForceServerError(request: Request): boolean {
  return state.forceServerError || getRequestScenario(request) === "force-500";
}

/** True if this request should behave as a declined/failed payment. */
export function shouldForcePaymentFailed(request: Request): boolean {
  return state.forcePaymentFailed || getRequestScenario(request) === "force-payment-failed";
}

/** True if this request should report cart/order lines as unavailable. */
export function shouldForceStockUnavailable(request: Request): boolean {
  return state.forceStockUnavailable || getRequestScenario(request) === "force-stock-unavailable";
}

/** True if this request should simulate a network-reachability failure (handled by not responding via a thrown error the client's httpClient maps to UnreachableError). */
export function shouldForceNetworkError(request: Request): boolean {
  return getRequestScenario(request) === "force-network-error";
}
