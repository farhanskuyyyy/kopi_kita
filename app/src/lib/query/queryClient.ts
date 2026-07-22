import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { SessionExpiredError } from "@/lib/api/ApiError";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";
import { useStaffSessionStore } from "@/features/auth/store/staffSessionStore";
import { toast } from "@/lib/toast";
import { router } from "@/app/routes";

export type AuthDomainMeta = { authDomain?: "customer" | "staff" };

/**
 * §3.2 — session expiry mid-task: clear that domain's session + toast + redirect to its
 * login. Uses the data router's own `.navigate()` rather than a full page reload, since a
 * reload would also wipe the mocked in-memory db (Mock-Scenarios §6).
 *
 * QA Defect #1 hardening: a 401 can also surface here because a query fired before the
 * zustand-`persist` store finished rehydrating from localStorage — no token was sent, so
 * the "expiry" is an artifact of the race, not a real rejection of the current session.
 * Route guards now hold rendering (and therefore query-firing) until `hasHydrated`, but
 * this handler double-checks the same signal before acting: only clear + redirect when
 * the store has finished hydrating AND actually holds a token that the server rejected.
 * If the store isn't hydrated yet, or already has no token, there's nothing valid to
 * revoke — silently ignore rather than falsely evicting a real session.
 */
function handleSessionExpiry(error: unknown, meta: AuthDomainMeta | undefined) {
  if (!(error instanceof SessionExpiredError)) return;
  const domain = meta?.authDomain;
  if (domain === "customer") {
    const { hasHydrated, token } = useCustomerSessionStore.getState();
    if (!hasHydrated || !token) return;
    useCustomerSessionStore.getState().clear();
    toast.error("Session expired, please log in again.");
    void router.navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  } else if (domain === "staff") {
    const { hasHydrated, token } = useStaffSessionStore.getState();
    if (!hasHydrated || !token) return;
    useStaffSessionStore.getState().clear();
    toast.error("Session expired, please log in again.");
    void router.navigate(`/admin/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  }
}

/**
 * Frontend-Architecture §2.2: read-heavy public data gets a ~60s staleTime and no
 * refetch-on-window-refocus (demo, not latency-sensitive) to avoid skeleton flashes.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => handleSessionExpiry(error, query.meta as AuthDomainMeta | undefined),
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => handleSessionExpiry(error, mutation.meta as AuthDomainMeta | undefined),
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
