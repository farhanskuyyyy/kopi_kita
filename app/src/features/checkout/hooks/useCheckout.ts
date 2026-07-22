import { useMutation } from "@tanstack/react-query";
import { createOrder, validatePaymentMethod, type CreateOrderPayload } from "../api/checkoutApi";
import type { PaymentMethod } from "@/features/orders/schemas/order.schemas";

export function useValidatePaymentMethod() {
  return useMutation({
    mutationFn: (paymentMethod: PaymentMethod) => validatePaymentMethod(paymentMethod),
    meta: { authDomain: "customer" },
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    meta: { authDomain: "customer" },
  });
}
