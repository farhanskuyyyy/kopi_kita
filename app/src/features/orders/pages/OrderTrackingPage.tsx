import { Navigate, useParams } from "react-router-dom";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSkeleton } from "@/components/feedback/Skeletons";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useOrder } from "../hooks/useOrders";
import { NotFoundError } from "@/lib/api/ApiError";
import { formatDateTime } from "@/lib/format/date";
import { formatIDR } from "@/lib/format/currency";
import type { OrderStatus } from "../schemas/order.schemas";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "received", label: "Received" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

/** Screen 10 — Order Tracking (F-017, §3.11). Polls while not terminal. */
export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const orderQuery = useOrder(orderId, { poll: true });

  if (orderQuery.isError && orderQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  if (orderQuery.isLoading) return <DetailSkeleton />;

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorBanner message="Couldn't load order tracking." onRetry={() => orderQuery.refetch()} />;
  }

  const order = orderQuery.data;
  const currentIndex = STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Track Order #{order.id}</h1>
        <Button variant="outline" size="sm" onClick={() => orderQuery.refetch()}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh status
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step.status} className="flex flex-1 flex-col items-center gap-2 text-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2",
                    i <= currentIndex ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {i <= currentIndex ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <span className={cn("text-xs font-medium", i <= currentIndex ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn("absolute mt-4 h-0.5 w-full translate-x-1/2", i < currentIndex ? "bg-primary" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>

          {order.estimatedReadyAt && (
            <p className="text-center text-sm text-muted-foreground">
              Estimated ready: {formatDateTime(order.estimatedReadyAt)}
            </p>
          )}
          {order.lastStatusChangeAt && (
            <p className="text-center text-xs text-muted-foreground">
              Last updated: {formatDateTime(order.lastStatusChangeAt)}
            </p>
          )}

          <div className="space-y-2 border-t pt-4">
            {order.lines.map((l) => (
              <div key={l.productId} className="flex justify-between text-sm">
                <span>
                  {l.quantity}× {l.name}
                </span>
                <span>{formatIDR(l.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>{formatIDR(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
