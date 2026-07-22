import { httpClient } from "@/lib/api/httpClient";
import { z } from "zod";

const CountSchema = z.object({ count: z.number() });

export async function getProductCount(): Promise<number> {
  const data = await httpClient.get<unknown>("/admin/dashboard/counts/products", { domain: "staff" });
  return CountSchema.parse(data).count;
}

export async function getCategoryCount(): Promise<number> {
  const data = await httpClient.get<unknown>("/admin/dashboard/counts/categories", { domain: "staff" });
  return CountSchema.parse(data).count;
}

export async function getOpenOrderCount(): Promise<number> {
  const data = await httpClient.get<unknown>("/admin/dashboard/counts/orders", { domain: "staff" });
  return CountSchema.parse(data).count;
}
