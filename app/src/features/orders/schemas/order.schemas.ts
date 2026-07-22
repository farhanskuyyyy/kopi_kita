import { z } from "zod";

export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().nullable().optional(),
  city: z.string(),
  postalCode: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

export const FulfillmentMethodSchema = z.enum(["pickup", "dine-in", "delivery"]);
export type FulfillmentMethod = z.infer<typeof FulfillmentMethodSchema>;

export const PaymentMethodSchema = z.enum(["demo_credit_card", "demo_cash_on_pickup", "demo_e_wallet", "demo_declined_card"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const OrderStatusSchema = z.enum(["received", "preparing", "ready", "completed"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderLineSchema = z.object({
  productId: z.string(),
  name: z.string(),
  customizationSummary: z.string().nullable(),
  unitPrice: z.number(),
  quantity: z.number(),
  lineTotal: z.number(),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const OrderCustomerSchema = z.object({
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isGuest: z.boolean(),
  accountId: z.string().nullable().optional(),
});
export type OrderCustomer = z.infer<typeof OrderCustomerSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  status: OrderStatusSchema,
  createdAt: z.string(),
  estimatedReadyAt: z.string().nullable().optional(),
  lastStatusChangeAt: z.string().nullable().optional(),
  autoProgressionStopped: z.boolean().optional().default(false),
  fulfillmentMethod: FulfillmentMethodSchema,
  address: AddressSchema.nullable().optional(),
  paymentMethod: PaymentMethodSchema,
  lines: z.array(OrderLineSchema),
  subtotal: z.number(),
  tax: z.number(),
  discount: z.number(),
  total: z.number(),
  customer: OrderCustomerSchema,
  promoCode: z.string().nullable().optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderSummarySchema = z.object({
  id: z.string(),
  placedAt: z.string(),
  status: OrderStatusSchema,
  total: z.number(),
  itemCount: z.number(),
  fulfillmentMethod: FulfillmentMethodSchema,
  customerName: z.string().optional(),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;
