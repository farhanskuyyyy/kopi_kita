import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DetailSkeleton } from "@/components/feedback/Skeletons";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useAdminOrder, useAdvanceOrderStatus, useOverrideOrderStatus } from "../hooks/useAdminOrders";
import { NotFoundError } from "@/lib/api/ApiError";
import { formatIDR } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import type { OrderStatus } from "@/features/orders/schemas/order.schemas";
import { toast } from "@/lib/toast";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  received: "secondary",
  preparing: "warning",
  ready: "default",
  completed: "success",
};

const ALL_STATUSES: OrderStatus[] = ["received", "preparing", "ready", "completed"];

/** Screen 26 — Admin Order Detail (F-042, F-043, §3.11). */
export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const orderQuery = useAdminOrder(orderId);
  const advance = useAdvanceOrderStatus();
  const override = useOverrideOrderStatus();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>("received");

  if (orderQuery.isError && orderQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  if (orderQuery.isLoading) return <DetailSkeleton />;

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorBanner message="Couldn't load this order." onRetry={() => orderQuery.refetch()} />;
  }

  const order = orderQuery.data;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status] ?? "default"} className="h-fit capitalize">
          {order.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h2 className="font-semibold">Customer</h2>
          <p className="text-sm">{order.customer.name}</p>
          {order.customer.email && <p className="text-sm text-muted-foreground">{order.customer.email}</p>}
          {order.customer.phone && <p className="text-sm text-muted-foreground">{order.customer.phone}</p>}
          <p className="text-sm capitalize">{order.fulfillmentMethod}</p>
          {order.address && (
            <p className="text-sm text-muted-foreground">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city} {order.address.postalCode}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h2 className="font-semibold">Items</h2>
          {order.lines.map((l) => (
            <div key={l.productId} className="flex justify-between text-sm">
              <span>
                {l.quantity}× {l.name}
                {l.customizationSummary && <span className="text-muted-foreground"> ({l.customizationSummary})</span>}
              </span>
              <span>{formatIDR(l.lineTotal)}</span>
            </div>
          ))}
          <div className="space-y-1 border-t pt-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatIDR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatIDR(order.tax)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatIDR(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatIDR(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.lastStatusChangeAt && (
        <p className="text-xs text-muted-foreground">Last status change: {formatDateTime(order.lastStatusChangeAt)}</p>
      )}

      <div className="flex gap-3">
        <Button
          disabled={order.status === "completed"}
          isLoading={advance.isPending}
          onClick={() =>
            advance.mutate(order.id, {
              onSuccess: () => toast.success("Status advanced"),
              onError: () => toast.error("Couldn't update status."),
            })
          }
        >
          Advance
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTargetStatus(order.status);
            setOverrideOpen(true);
          }}
        >
          Override
        </Button>
      </div>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override status</DialogTitle>
            <DialogDescription>This permanently stops this order's auto-progression timer.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={targetStatus} onValueChange={(v) => setTargetStatus(v as OrderStatus)}>
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <RadioGroupItem value={s} id={`status-${s}`} />
                <Label htmlFor={`status-${s}`} className="font-normal capitalize">
                  {s}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button
              isLoading={override.isPending}
              onClick={() =>
                override.mutate(
                  { orderId: order.id, targetStatus },
                  {
                    onSuccess: () => {
                      toast.success("Status overridden");
                      setOverrideOpen(false);
                    },
                    onError: () => toast.error("Couldn't update status."),
                  },
                )
              }
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
