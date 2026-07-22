import { httpClient } from "@/lib/api/httpClient";
import { StoreInfoSchema, type StoreInfo } from "../schemas/storeInfo.schemas";

export async function getStoreInfo(): Promise<StoreInfo> {
  const data = await httpClient.get<unknown>("/store-info");
  return StoreInfoSchema.parse(data);
}
