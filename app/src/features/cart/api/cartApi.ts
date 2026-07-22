import { httpClient } from "@/lib/api/httpClient";
import { CartValidateResultSchema, PromoValidateResultSchema, type CartValidateResult, type PromoValidateResult } from "../schemas/cart.schemas";

export interface CartLineInput {
  productId: string;
  quantity: number;
  selectedOptionIds?: string[];
}

export async function validateCart(lines: CartLineInput[]): Promise<CartValidateResult> {
  const data = await httpClient.post<unknown>("/cart/validate", { lines });
  return CartValidateResultSchema.parse(data);
}

export async function validatePromo(code: string, subtotal: number): Promise<PromoValidateResult> {
  const data = await httpClient.post<unknown>("/promo/validate", { code, subtotal });
  return PromoValidateResultSchema.parse(data);
}
