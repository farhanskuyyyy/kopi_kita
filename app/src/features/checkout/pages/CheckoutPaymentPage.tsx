import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckoutSummary } from "../components/CheckoutSummary";
import { useCheckoutDraftStore } from "../store/checkoutDraftStore";
import { useValidatePaymentMethod } from "../hooks/useCheckout";
import type { PaymentMethod } from "@/features/orders/schemas/order.schemas";
import { ApiError } from "@/lib/api/ApiError";
import { toast } from "@/lib/toast";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; description?: string }[] = [
  { value: "demo_credit_card", label: "Demo Credit Card" },
  { value: "demo_cash_on_pickup", label: "Demo Cash on Pickup" },
  { value: "demo_e_wallet", label: "Demo E-Wallet" },
  { value: "demo_declined_card", label: "Demo Declined Card", description: "Triggers a mocked payment failure" },
];

/** Screen 7 — Checkout: Payment (F-013). Demo payment — no real charge occurs. */
export function CheckoutPaymentPage() {
  const navigate = useNavigate();
  const draftMethod = useCheckoutDraftStore((s) => s.paymentMethod);
  const setPaymentMethod = useCheckoutDraftStore((s) => s.setPaymentMethod);
  const [selected, setSelected] = useState<PaymentMethod>(draftMethod ?? "demo_credit_card");
  const [error, setError] = useState<string | null>(null);
  const validatePayment = useValidatePaymentMethod();

  function handleContinue() {
    setError(null);
    validatePayment.mutate(selected, {
      onSuccess: () => {
        setPaymentMethod(selected);
        navigate("/checkout/review");
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : "Payment could not be processed.";
        setError(message);
        toast.error(message);
      },
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Checkout — Payment</h1>
        <p className="text-sm text-muted-foreground">Demo Payment — no real charge will occur.</p>

        <RadioGroup value={selected} onValueChange={(v) => setSelected(v as PaymentMethod)} className="space-y-3">
          {PAYMENT_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-start gap-2 rounded-md border p-3">
              <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} className="mt-0.5" />
              <Label htmlFor={`pm-${opt.value}`} className="font-normal">
                <span className="block font-medium text-foreground">{opt.label}</span>
                {opt.description && <span className="text-xs text-muted-foreground">{opt.description}</span>}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/checkout/details")}>
            Back
          </Button>
          <Button className="flex-1" isLoading={validatePayment.isPending} onClick={handleContinue}>
            Continue to Review
          </Button>
        </div>
      </div>
      <CheckoutSummary />
    </div>
  );
}
