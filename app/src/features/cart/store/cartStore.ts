import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Cart contents — Zustand + persist -> localStorage (Frontend-Architecture §2). Device/
 * browser-scoped (A11), survives reload, cleared only on order placement or explicit
 * removal (§3.3). Unit price is computed once at add-to-cart time (D4/§3.12, owned by
 * features/cart/lib/pricing.ts) and frozen on the line — never recomputed here.
 */
export interface CartLine {
  lineId: string;
  productId: string;
  name: string;
  image: string | null;
  customizationSummary: string | null;
  selectedOptionIds: string[];
  unitPrice: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "lineId">) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

function genLineId(): string {
  return `line_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      addLine: (line) =>
        set((state) => ({
          lines: [...state.lines, { ...line, lineId: genLineId() }],
        })),
      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
        })),
      removeLine: (lineId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.lineId !== lineId),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "coffeeshop.cart" },
  ),
);
