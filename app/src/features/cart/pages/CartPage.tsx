import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatIDR } from "@/lib/format/currency";
import { useCartStore } from "../store/cartStore";
import { useCartValidation, useValidatePromo } from "../hooks/useCart";
import { CartLineItem } from "../components/CartLineItem";
import { useCheckoutDraftStore } from "@/features/checkout/store/checkoutDraftStore";

const TAX_RATE = 0.1;

/** Screen 5 — Cart (F-007–F-010, F-025, F-026). */
export function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const validation = useCartValidation();
  const validatePromo = useValidatePromo();
  const setPromoCode = useCheckoutDraftStore((s) => s.setPromoCode);
  const navigate = useNavigate();

  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; message: string | null; discountAmount: number } | null>(null);

  const unavailableByProductId = useMemo(() => {
    const map = new Map<string, string>();
    validation.data?.lines.forEach((l) => {
      if (!l.available) map.set(l.productId, l.unavailableReason ?? "No longer available");
    });
    return map;
  }, [validation.data]);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = promoResult?.valid ? promoResult.discountAmount : 0;
  const tax = Math.round((subtotal - discount) * TAX_RATE);
  const total = subtotal - discount + tax;

  const hasUnavailable = lines.some((l) => unavailableByProductId.has(l.productId));

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add something delicious from the menu to get started."
        ctaLabel="Browse menu"
        ctaHref="/menu"
      />
    );
  }

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    validatePromo.mutate(
      { code: promoInput.trim(), subtotal },
      {
        onSuccess: (result) => {
          setPromoResult(result);
          if (result.valid) setPromoCode(result.code, result.discountAmount);
        },
      },
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Your Cart</h1>
        {validation.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              {lines.map((line) => (
                <CartLineItem key={line.lineId} line={line} unavailableReason={unavailableByProductId.get(line.productId)} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {hasUnavailable && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Resolve unavailable items before proceeding to checkout.
          </div>
        )}

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Promo code"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                aria-label="Promo code"
              />
              <Button variant="outline" onClick={handleApplyPromo} isLoading={validatePromo.isPending}>
                Apply
              </Button>
            </div>
            {promoResult && (
              <p className={promoResult.valid ? "text-sm text-success" : "text-sm text-destructive"}>
                {promoResult.valid ? `Promo applied: -${formatIDR(promoResult.discountAmount)}` : promoResult.message}
              </p>
            )}

            <div className="space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatIDR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated tax (10%)</span>
                <span>{formatIDR(tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatIDR(total)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" disabled={hasUnavailable} onClick={() => navigate("/checkout/details")}>
              Proceed to Checkout
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/menu">Continue shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
