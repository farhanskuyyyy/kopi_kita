import { httpClient } from "@/lib/api/httpClient";
import { OrderSchema, type Order } from "../schemas/order.schemas";

export async function getOrder(orderId: string): Promise<Order> {
  const data = await httpClient.get<unknown>(`/orders/${encodeURIComponent(orderId)}`);
  return OrderSchema.parse(data);
}
