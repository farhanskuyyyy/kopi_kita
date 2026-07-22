import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAdvanceOrderStatus, adminGetOrder, adminListOrders, adminOverrideOrderStatus, type AdminListOrdersParams } from "../api/adminOrdersApi";
import type { OrderStatus } from "@/features/orders/schemas/order.schemas";
import { orderKeys } from "@/features/orders/hooks/useOrders";
import { NotFoundError } from "@/lib/api/ApiError";

export const adminOrderKeys = {
  all: ["admin", "orders"] as const,
  list: (filters: AdminListOrdersParams) => [...adminOrderKeys.all, "list", filters] as const,
  detail: (id: string) => [...adminOrderKeys.all, "detail", id] as const,
};

export function useAdminOrders(params: AdminListOrdersParams) {
  return useQuery({
    queryKey: adminOrderKeys.list(params),
    queryFn: () => adminListOrders(params),
    meta: { authDomain: "staff" },
  });
}

export function useAdminOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: adminOrderKeys.detail(orderId ?? ""),
    queryFn: () => adminGetOrder(orderId as string),
    enabled: !!orderId,
    meta: { authDomain: "staff" },
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
  });
}

function invalidateOrderCaches(queryClient: ReturnType<typeof useQueryClient>, orderId: string) {
  queryClient.invalidateQueries({ queryKey: adminOrderKeys.all });
  queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
}

export function useAdvanceOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => adminAdvanceOrderStatus(orderId),
    meta: { authDomain: "staff" },
    onSuccess: (_data, orderId) => invalidateOrderCaches(queryClient, orderId),
  });
}

export function useOverrideOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, targetStatus }: { orderId: string; targetStatus: OrderStatus }) =>
      adminOverrideOrderStatus(orderId, targetStatus),
    meta: { authDomain: "staff" },
    onSuccess: (_data, vars) => invalidateOrderCaches(queryClient, vars.orderId),
  });
}
