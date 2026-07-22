import { z } from "zod";

export const CartLineValidatedSchema = z.object({
  productId: z.string(),
  name: z.string(),
  customizationSummary: z.string().nullable().optional(),
  unitPrice: z.number(),
  quantity: z.number(),
  lineTotal: z.number(),
  available: z.boolean(),
  unavailableReason: z.string().nullable().optional(),
});
export type CartLineValidated = z.infer<typeof CartLineValidatedSchema>;

export const CartValidateResultSchema = z.object({
  lines: z.array(CartLineValidatedSchema),
  allAvailable: z.boolean(),
  subtotal: z.number(),
});
export type CartValidateResult = z.infer<typeof CartValidateResultSchema>;

export const PromoValidateResultSchema = z.object({
  valid: z.boolean(),
  code: z.string(),
  type: z.enum(["percent", "fixed"]).nullable(),
  value: z.number().nullable(),
  discountAmount: z.number(),
  message: z.string().nullable(),
});
export type PromoValidateResult = z.infer<typeof PromoValidateResultSchema>;
