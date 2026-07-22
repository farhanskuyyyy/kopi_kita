import { useQuery } from "@tanstack/react-query";
import { getOrder } from "../api/ordersApi";
import { NotFoundError } from "@/lib/api/ApiError";

export const orderKeys = {
  all: ["orders"] as const,
  detail: (id: string) => [...orderKeys.all, "detail", id] as const,
};

/**
 * Order Tracking (Screen 10) polls this while the order is not terminal, per
 * Frontend-Architecture §2.2 — a short refetchInterval that stops once status is
 * `completed`, reflecting timer/staff-driven changes near-immediately (§3.11).
 */
export function useOrder(orderId: string | undefined, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: orderKeys.detail(orderId ?? ""),
    queryFn: () => getOrder(orderId as string),
    enabled: !!orderId,
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
    refetchInterval: options.poll
      ? (query) => (query.state.data && query.state.data.status !== "completed" ? 5000 : false)
      : false,
  });
}
