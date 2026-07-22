import { useQuery } from "@tanstack/react-query";
import { getStoreInfo } from "../api/storeInfoApi";

/** Typed query-key factory (Frontend-Architecture §6) — avoids ad-hoc key arrays per hook. */
export const storeInfoKeys = {
  detail: ["store-info"] as const,
};

export function useStoreInfo() {
  return useQuery({ queryKey: storeInfoKeys.detail, queryFn: getStoreInfo });
}
