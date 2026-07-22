import { httpClient } from "@/lib/api/httpClient";
import { OrderSchema, OrderSummarySchema, type Order, type OrderSummary, type OrderStatus } from "@/features/orders/schemas/order.schemas";
import { z } from "zod";

export interface AdminListOrdersParams {
  status?: "all" | "received" | "preparing" | "ready" | "completed";
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

export async function adminListOrders(params: AdminListOrdersParams = {}): Promise<{ items: OrderSummary[] }> {
  const data = await httpClient.get<{ items: unknown[] }>("/admin/orders", { query: { ...params }, domain: "staff" });
  return { items: z.array(OrderSummarySchema).parse(data.items) };
}

export async function adminGetOrder(orderId: string): Promise<Order> {
  const data = await httpClient.get<unknown>(`/admin/orders/${encodeURIComponent(orderId)}`, { domain: "staff" });
  return OrderSchema.parse(data);
}

export async function adminAdvanceOrderStatus(orderId: string): Promise<Order> {
  const data = await httpClient.patch<unknown>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    { action: "advance" },
    { domain: "staff" },
  );
  return OrderSchema.parse(data);
}

export async function adminOverrideOrderStatus(orderId: string, targetStatus: OrderStatus): Promise<Order> {
  const data = await httpClient.patch<unknown>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    { action: "override", targetStatus },
    { domain: "staff" },
  );
  return OrderSchema.parse(data);
}
