import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CheckoutDetailsPayload as CheckoutDetails } from "../api/checkoutApi";
import type { PaymentMethod } from "@/features/orders/schemas/order.schemas";

/**
 * Checkout draft (Details + Payment step data) — persisted to sessionStorage so it
 * survives the mid-checkout register/login detour (D5, R3) within the same tab, but is
 * not device-persistent beyond the session (Frontend-Architecture §2).
 */
interface CheckoutDraftState {
  details: CheckoutDetails | null;
  paymentMethod: PaymentMethod | null;
  promoCode: string | null;
  discountAmount: number;
  setDetails: (details: CheckoutDetails) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPromoCode: (code: string | null, discountAmount?: number) => void;
  clear: () => void;
}

export const useCheckoutDraftStore = create<CheckoutDraftState>()(
  persist(
    (set) => ({
      details: null,
      paymentMethod: null,
      promoCode: null,
      discountAmount: 0,
      setDetails: (details) => set({ details }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setPromoCode: (promoCode, discountAmount = 0) => set({ promoCode, discountAmount }),
      clear: () => set({ details: null, paymentMethod: null, promoCode: null, discountAmount: 0 }),
    }),
    { name: "coffeeshop.checkout-draft", storage: createJSONStorage(() => sessionStorage) },
  ),
);
