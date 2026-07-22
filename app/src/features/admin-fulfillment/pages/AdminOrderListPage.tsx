import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { TableRowsSkeleton } from "@/components/feedback/Skeletons";
import { useAdminOrders } from "../hooks/useAdminOrders";
import { formatDateTime } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/currency";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  received: "secondary",
  preparing: "warning",
  ready: "default",
  completed: "success",
};

/** Screen 25 — Admin Order List (F-041). */
export function AdminOrderListPage() {
  const [status, setStatus] = useState<"all" | "received" | "preparing" | "ready" | "completed">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const ordersQuery = useAdminOrders({ status, sort, limit: 50 });
  const navigate = useNavigate();

  const items = ordersQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-40" aria-label="Filter by order status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-36" aria-label="Sort orders">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {ordersQuery.isError && <ErrorBanner message="Couldn't load orders." onRetry={() => ordersQuery.refetch()} />}

      {ordersQuery.isSuccess && items.length === 0 && <EmptyState title="No orders right now" />}

      {(ordersQuery.isLoading || items.length > 0) && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersQuery.isLoading && <TableRowsSkeleton rows={5} columns={6} />}
                {items.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <TableCell>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{order.id}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(order.placedAt)}</TableCell>
                    <TableCell>{order.customerName ?? "—"}</TableCell>
                    <TableCell className="capitalize">{order.fulfillmentMethod}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status] ?? "default"} className="capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatIDR(order.total)}</TableCell>
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
