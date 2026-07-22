import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatIDR } from "@/lib/format/currency";
import { useCartStore } from "@/features/cart/store/cartStore";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { useCreateOrder } from "../hooks/useCheckout";
import { ApiError } from "@/lib/api/ApiError";
import { toast } from "@/lib/toast";
import { useState } from "react";

const TAX_RATE = 0.1;
const PAYMENT_LABELS: Record<string, string> = {
  demo_credit_card: "Demo Credit Card",
  demo_cash_on_pickup: "Demo Cash on Pickup",
  demo_e_wallet: "Demo E-Wallet",
  demo_declined_card: "Demo Declined Card",
};

/** Screen 8 — Checkout: Review (F-014, F-015). */
export function CheckoutReviewPage() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const details = useCheckoutDraftStore((s) => s.details);
  const paymentMethod = useCheckoutDraftStore((s) => s.paymentMethod);
  const promoCode = useCheckoutDraftStore((s) => s.promoCode);
  const discountAmount = useCheckoutDraftStore((s) => s.discountAmount);
  const clearDraft = useCheckoutDraftStore((s) => s.clear);
  const createOrder = useCreateOrder();
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const tax = Math.round((subtotal - discountAmount) * TAX_RATE);
  const total = subtotal - discountAmount + tax;

  if (!details || !paymentMethod) return null;

  function handlePlaceOrder() {
    setError(null);
    createOrder.mutate(
      {
        details: {
          fullName: details!.fullName,
          email: details!.email,
          phone: details!.phone,
          fulfillmentMethod: details!.fulfillmentMethod,
          address: details!.address ?? null,
        },
        paymentMethod: paymentMethod!,
        promoCode: promoCode ?? null,
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selectedOptionIds: l.selectedOptionIds })),
      },
      {
        onSuccess: (order) => {
          // Navigate away from the cart-guarded checkout route first, and defer clearing
          // the cart to the next tick. RequireNonEmptyCart is still mounted on this route
          // until React actually commits the navigation; clearing synchronously in the same
          // tick would make that guard observe an empty cart and redirect to /cart, racing
          // (and winning) against this navigate() call.
          navigate(`/order/confirmation/${order.id}`, { replace: true });
          toast.success("Order placed!", `Order #${order.id}`);
          setTimeout(() => {
            clearCart();
            clearDraft();
          }, 0);
        },
        onError: (err) => {
          const message =
            err instanceof ApiError
              ? err.code === "STOCK_UNAVAILABLE"
                ? "Some items in your cart are no longer available. Please review your cart."
                : err.message
              : "Couldn't place your order. Please try again.";
          setError(message);
          toast.error(message);
        },
      },
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Checkout — Review</h1>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Items</h2>
            <Button variant="link" size="sm" onClick={() => navigate("/cart")}>
              Edit
            </Button>
          </div>
          {lines.map((l) => (
            <div key={l.lineId} className="flex justify-between text-sm">
              <span>
                {l.quantity}× {l.name}
                {l.customizationSummary && <span className="text-muted-foreground"> ({l.customizationSummary})</span>}
              </span>
              <span>{formatIDR(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Details</h2>
            <Button variant="link" size="sm" onClick={() => navigate("/checkout/details")}>
              Edit
            </Button>
          </div>
          <p className="text-sm">{details.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {details.email} · {details.phone}
          </p>
          <p className="text-sm capitalize">{details.fulfillmentMethod}</p>
          {details.address && (
            <p className="text-sm text-muted-foreground">
              {details.address.line1}
              {details.address.line2 ? `, ${details.address.line2}` : ""}, {details.address.city} {details.address.postalCode}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Payment</h2>
            <Button variant="link" size="sm" onClick={() => navigate("/checkout/payment")}>
              Edit
            </Button>
          </div>
          <p className="text-sm">{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 p-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatIDR(discountAmount)}</span>
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
        </CardContent>
      </Card>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <Button size="lg" className="w-full" isLoading={createOrder.isPending} onClick={handlePlaceOrder}>
        Place Order
      </Button>
    </div>
  );
}
