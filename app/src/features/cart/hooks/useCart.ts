import { useMutation, useQuery } from "@tanstack/react-query";
import { validateCart, validatePromo, type CartLineInput } from "../api/cartApi";
import { useCartStore } from "../store/cartStore";

export const cartKeys = {
  all: ["cart"] as const,
  stockCheck: (ids: string[]) => [...cartKeys.all, "stock-check", ids] as const,
};

function toLineInputs(lines: ReturnType<typeof useCartStore.getState>["lines"]): CartLineInput[] {
  return lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selectedOptionIds: l.selectedOptionIds }));
}

/** Cart hydrate / stock re-check (Screens 5, 8) — re-validates every line against the mock. */
export function useCartValidation() {
  const lines = useCartStore((s) => s.lines);
  const inputs = toLineInputs(lines);
  return useQuery({
    queryKey: cartKeys.stockCheck(inputs.map((l) => l.productId)),
    queryFn: () => validateCart(inputs),
    enabled: lines.length > 0,
  });
}

export function useValidatePromo() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) => validatePromo(code, subtotal),
  });
}
