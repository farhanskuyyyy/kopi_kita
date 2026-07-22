import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../schemas/auth.schemas";

/**
 * Customer identity domain (spec §3.1) — independent from staff session, per
 * Frontend-Architecture §2/§9.1. Persisted to localStorage so it survives reload.
 */
interface CustomerSessionState {
  token: string | null;
  user: User | null;
  /** True once zustand `persist` has finished reading localStorage (see hydration-race
   * fix, QA Defect #1). Authenticated queries/route guards must wait on this before
   * trusting `token === null` to mean "not logged in". */
  hasHydrated: boolean;
  setSession: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  clear: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useCustomerSessionStore = create<CustomerSessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setSession: (token, user) => set({ token, user }),
      updateUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "coffeeshop.customer-session",
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Failed to rehydrate customer session", error);
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function getCustomerToken(): string | null {
  return useCustomerSessionStore.getState().token;
}

export function useCustomerHasHydrated(): boolean {
  return useCustomerSessionStore((s) => s.hasHydrated);
}
