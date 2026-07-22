import { useQuery } from "@tanstack/react-query";
import { getCategoryCount, getOpenOrderCount, getProductCount } from "../api/adminDashboardApi";

/** Typed query-key factory (Frontend-Architecture §6) — avoids ad-hoc key arrays per hook. */
export const adminDashboardKeys = {
  products: ["admin", "dashboard", "products"] as const,
  categories: ["admin", "dashboard", "categories"] as const,
  orders: ["admin", "dashboard", "orders"] as const,
};

/** Split per-tile (spec Screen 18) so one failing tile doesn't block the others. */
export function useProductCount() {
  return useQuery({ queryKey: adminDashboardKeys.products, queryFn: getProductCount, meta: { authDomain: "staff" } });
}

export function useCategoryCount() {
  return useQuery({ queryKey: adminDashboardKeys.categories, queryFn: getCategoryCount, meta: { authDomain: "staff" } });
}

export function useOpenOrderCount() {
  return useQuery({ queryKey: adminDashboardKeys.orders, queryFn: getOpenOrderCount, meta: { authDomain: "staff" } });
}
