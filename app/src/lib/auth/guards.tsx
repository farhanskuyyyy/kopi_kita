import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";
import { useStaffSessionStore } from "@/features/auth/store/staffSessionStore";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useCheckoutDraftStore } from "@/features/checkout/store/checkoutDraftStore";
import type { StaffRole } from "@/features/auth/schemas/auth.schemas";
import { ProductGridSkeleton } from "@/components/feedback/Skeletons";

/**
 * Centralized route guards (Frontend-Architecture §1.3/§7, spec §3.2). All gating logic
 * lives here and is composed in app/routes.tsx — never re-implemented per page. Plain
 * wrapper components around <Outlet/>.
 */

/**
 * QA Defect #1 fix: zustand `persist` rehydrates from localStorage asynchronously, so on a
 * full reload / direct-URL-entry the store's `token` briefly reads `null` even for a
 * genuinely logged-in user. Rendering (and therefore firing any authenticated queries)
 * before hydration finishes was causing a false "session expired" logout. Block on
 * `hasHydrated` first so the guard's decision — and everything it mounts — only ever sees
 * the real, rehydrated token.
 */
function HydrationPending() {
  return <ProductGridSkeleton />;
}

export function RequireCustomerAuth() {
  const token = useCustomerSessionStore((s) => s.token);
  const hasHydrated = useCustomerSessionStore((s) => s.hasHydrated);
  const location = useLocation();
  if (!hasHydrated) return <HydrationPending />;
  if (!token) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <Outlet />;
}

export function RedirectIfCustomerAuthed() {
  const token = useCustomerSessionStore((s) => s.token);
  const hasHydrated = useCustomerSessionStore((s) => s.hasHydrated);
  if (!hasHydrated) return <HydrationPending />;
  if (token) return <Navigate to="/account" replace />;
  return <Outlet />;
}

/** Authentication only — checks staff session presence, never role. */
export function RequireStaffAuth() {
  const token = useStaffSessionStore((s) => s.token);
  const hasHydrated = useStaffSessionStore((s) => s.hasHydrated);
  const location = useLocation();
  if (!hasHydrated) return <HydrationPending />;
  if (!token) {
    return <Navigate to={`/admin/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <Outlet />;
}

export function RedirectIfStaffAuthed() {
  const token = useStaffSessionStore((s) => s.token);
  const hasHydrated = useStaffSessionStore((s) => s.hasHydrated);
  if (!hasHydrated) return <HydrationPending />;
  if (token) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/**
 * Authorization only (never catches "no session at all" — RequireStaffAuth must run
 * first in the composition, per Frontend-Architecture §1.3 RC-1 fix).
 */
export function RequireStaffRole({ role }: { role: StaffRole }) {
  const staffUser = useStaffSessionStore((s) => s.staffUser);
  if (!staffUser || staffUser.role !== role) {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
}

export function RequireNonEmptyCart() {
  const lines = useCartStore((s) => s.lines);
  if (lines.length === 0) {
    return <Navigate to="/cart" replace state={{ message: "Your cart is empty. Add items before checking out." }} />;
  }
  return <Outlet />;
}

export function RequireDetailsDraft() {
  const details = useCheckoutDraftStore((s) => s.details);
  if (!details) {
    return <Navigate to="/checkout/details" replace state={{ message: "Please complete your details first." }} />;
  }
  return <Outlet />;
}

export function RequirePaymentDraft() {
  const paymentMethod = useCheckoutDraftStore((s) => s.paymentMethod);
  if (!paymentMethod) {
    return <Navigate to="/checkout/payment" replace state={{ message: "Please select a payment method first." }} />;
  }
  return <Outlet />;
}
