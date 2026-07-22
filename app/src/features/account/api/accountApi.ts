import { httpClient } from "@/lib/api/httpClient";
import { UserSchema, type User } from "@/features/auth/schemas/auth.schemas";
import { ProductSchema, type Product } from "@/features/catalog/schemas/catalog.schemas";
import { OrderSummarySchema, type OrderSummary } from "@/features/orders/schemas/order.schemas";
import { CartLineValidatedSchema, type CartLineValidated } from "@/features/cart/schemas/cart.schemas";
import { z } from "zod";

export async function getProfile(): Promise<User> {
  const data = await httpClient.get<unknown>("/account/profile", { domain: "customer" });
  return UserSchema.parse(data);
}

export async function updateProfile(input: { name?: string; phone?: string }): Promise<User> {
  const data = await httpClient.put<unknown>("/account/profile", input, { domain: "customer" });
  return UserSchema.parse(data);
}

export async function listMyOrders(params: { status?: "all" | "active" | "completed" } = {}): Promise<{
  items: OrderSummary[];
}> {
  const data = await httpClient.get<{ items: unknown[] }>("/account/orders", { query: params, domain: "customer" });
  return { items: z.array(OrderSummarySchema).parse(data.items) };
}

export interface ReorderResult {
  addedLines: CartLineValidated[];
  unavailableItems: { productId: string; name: string }[];
}

export async function reorder(orderId: string): Promise<ReorderResult> {
  const data = await httpClient.post<unknown>(`/account/orders/${encodeURIComponent(orderId)}/reorder`, undefined, {
    domain: "customer",
  });
  return z
    .object({
      addedLines: z.array(CartLineValidatedSchema),
      unavailableItems: z.array(z.object({ productId: z.string(), name: z.string() })),
    })
    .parse(data);
}

export async function listFavorites(): Promise<Product[]> {
  const data = await httpClient.get<{ items: unknown[] }>("/account/favorites", { domain: "customer" });
  return z.array(ProductSchema).parse(data.items);
}

export async function addFavorite(productId: string): Promise<Product> {
  const data = await httpClient.post<unknown>("/account/favorites", { productId }, { domain: "customer" });
  return ProductSchema.parse(data);
}

export async function removeFavorite(productId: string): Promise<void> {
  await httpClient.delete<{ removed: boolean }>(`/account/favorites/${encodeURIComponent(productId)}`, { domain: "customer" });
}
