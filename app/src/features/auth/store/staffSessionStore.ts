import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StaffUser } from "../schemas/auth.schemas";

/**
 * Staff identity domain (spec §3.1) — never merged with the customer session store
 * (Frontend-Architecture §2/§9.1). Covers both Catalog Admin and Fulfillment Staff roles.
 */
interface StaffSessionState {
  token: string | null;
  staffUser: StaffUser | null;
  /** True once zustand `persist` has finished reading localStorage (see hydration-race
   * fix, QA Defect #1). Authenticated queries/route guards must wait on this before
   * trusting `token === null` to mean "not logged in". */
  hasHydrated: boolean;
  setSession: (token: string, staffUser: StaffUser) => void;
  clear: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useStaffSessionStore = create<StaffSessionState>()(
  persist(
    (set) => ({
      token: null,
      staffUser: null,
      hasHydrated: false,
      setSession: (token, staffUser) => set({ token, staffUser }),
      clear: () => set({ token: null, staffUser: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "coffeeshop.staff-session",
      partialize: (state) => ({ token: state.token, staffUser: state.staffUser }),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error("Failed to rehydrate staff session", error);
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function getStaffToken(): string | null {
  return useStaffSessionStore.getState().token;
}

export function useStaffHasHydrated(): boolean {
  return useStaffSessionStore((s) => s.hasHydrated);
}
