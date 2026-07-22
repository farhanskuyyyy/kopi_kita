import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { TableRowsSkeleton } from "@/components/feedback/Skeletons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyOrders, useReorder } from "../hooks/useAccount";
import { useCartStore } from "@/features/cart/store/cartStore";
import { formatDateTime } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/currency";
import { toast } from "@/lib/toast";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  received: "secondary",
  preparing: "warning",
  ready: "default",
  completed: "success",
};

/** Screen 14 — Order History (F-020, F-021). */
export function OrderHistoryPage() {
  const [status, setStatus] = useState<"all" | "active" | "completed">("all");
  const ordersQuery = useMyOrders(status);
  const reorder = useReorder();
  const addLine = useCartStore((s) => s.addLine);
  const navigate = useNavigate();

  function handleReorder(orderId: string) {
    reorder.mutate(orderId, {
      onSuccess: (result) => {
        result.addedLines.forEach((line) => {
          addLine({
            productId: line.productId,
            name: line.name,
            image: null,
            customizationSummary: line.customizationSummary ?? null,
            selectedOptionIds: [],
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          });
        });
        if (result.unavailableItems.length > 0) {
          toast.warning(
            `${result.unavailableItems.length} item(s) were no longer available and were not added`,
            result.unavailableItems.map((i) => i.name).join(", "),
          );
        } else if (result.addedLines.length > 0) {
          toast.success("Items added to your cart");
        }
        navigate("/cart");
      },
      onError: () => toast.error("Couldn't reorder. Please try again."),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order History</h1>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40" aria-label="Filter orders by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ordersQuery.isError && <ErrorBanner message="Couldn't load your orders." onRetry={() => ordersQuery.refetch()} />}

      {ordersQuery.isSuccess && ordersQuery.data.items.length === 0 && (
        <EmptyState title="No orders yet" description="Your past orders will show up here." ctaLabel="Browse menu" ctaHref="/menu" />
      )}

      {(ordersQuery.isLoading || (ordersQuery.isSuccess && ordersQuery.data.items.length > 0)) && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersQuery.isLoading && <TableRowsSkeleton rows={3} columns={6} />}
                {ordersQuery.data?.items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{formatDateTime(order.placedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "default"} className="capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatIDR(order.total)}</TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {order.status !== "completed" && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/orders/${order.id}/track`}>Track</Link>
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleReorder(order.id)} isLoading={reorder.isPending}>
                        Reorder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
