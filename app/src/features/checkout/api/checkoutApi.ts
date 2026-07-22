import { httpClient } from "@/lib/api/httpClient";
import { OrderSchema, type Order, type Address, type FulfillmentMethod, type PaymentMethod } from "@/features/orders/schemas/order.schemas";
import type { CartLineInput } from "@/features/cart/api/cartApi";
import { z } from "zod";

const ValidatePaymentMethodSchema = z.object({ valid: z.boolean() });

export interface CheckoutDetailsPayload {
  fullName: string;
  email: string;
  phone: string;
  fulfillmentMethod: FulfillmentMethod;
  address?: Address | null;
}

export interface CreateOrderPayload {
  details: CheckoutDetailsPayload;
  paymentMethod: PaymentMethod;
  promoCode?: string | null;
  lines: CartLineInput[];
}

export async function validatePaymentMethod(paymentMethod: PaymentMethod): Promise<{ valid: boolean }> {
  const data = await httpClient.post<unknown>("/checkout/payment/validate", { paymentMethod }, { domain: "customer" });
  return ValidatePaymentMethodSchema.parse(data);
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const data = await httpClient.post<unknown>("/orders", payload, { domain: "customer" });
  return OrderSchema.parse(data);
}
