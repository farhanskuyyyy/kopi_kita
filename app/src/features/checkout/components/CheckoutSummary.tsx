import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/format/currency";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";

const TAX_RATE = 0.1;

/** Order draft summary sidebar carried across all checkout steps (spec Screens 6–8). */
export function CheckoutSummary() {
  const lines = useCartStore((s) => s.lines);
  const promoCode = useCheckoutDraftStore((s) => s.promoCode);
  const discountAmount = useCheckoutDraftStore((s) => s.discountAmount);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const tax = Math.round((subtotal - discountAmount) * TAX_RATE);
  const total = subtotal - discountAmount + tax;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          {lines.map((l) => (
            <div key={l.lineId} className="flex justify-between gap-2">
              <span className="line-clamp-1">
                {l.quantity}× {l.name}
              </span>
              <span className="shrink-0">{formatIDR(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated tax (10%)</span>
            <span>{formatIDR(tax)}</span>
          </div>
          {promoCode && discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Promo: {promoCode}</span>
              <span>-{formatIDR(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
