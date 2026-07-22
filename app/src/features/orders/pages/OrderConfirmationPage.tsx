import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailSkeleton } from "@/components/feedback/Skeletons";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useOrder } from "../hooks/useOrders";
import { NotFoundError } from "@/lib/api/ApiError";
import { formatIDR } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import { useCustomerSessionStore } from "@/features/auth/store/customerSessionStore";

/** Screen 9 — Order Confirmation (F-016). Guest-accessible via bookmarkable URL (A10). */
export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const orderQuery = useOrder(orderId);
  const isCustomerAuthed = useCustomerSessionStore((s) => !!s.token);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (orderQuery.isError && orderQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  if (orderQuery.isLoading) return <DetailSkeleton />;

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorBanner message="Couldn't load your order." onRetry={() => orderQuery.refetch()} />;
  }

  const order = orderQuery.data;

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" />
      <div>
        <h1 className="text-2xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground">Order #{order.id}</p>
      </div>

      {!isCustomerAuthed && !bannerDismissed && (
        <div className="flex items-center justify-between rounded-md border bg-accent/40 p-3 text-left text-sm">
          <span>Create an account to track orders faster next time.</span>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to="/register">Sign up</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setBannerDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <Card className="text-left">
        <CardContent className="space-y-3 p-4">
          {order.lines.map((l) => (
            <div key={l.productId} className="flex justify-between text-sm">
              <span>
                {l.quantity}× {l.name}
              </span>
              <span>{formatIDR(l.lineTotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatIDR(order.total)}</span>
          </div>
          <p className="text-sm capitalize text-muted-foreground">Fulfillment: {order.fulfillmentMethod}</p>
          {order.estimatedReadyAt && (
            <p className="text-sm text-muted-foreground">Estimated ready: {formatDateTime(order.estimatedReadyAt)}</p>
          )}
        </CardContent>
      </Card>

      <Button asChild size="lg" className="w-full">
        <Link to={`/orders/${order.id}/track`}>Track Order</Link>
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to="/menu">Continue shopping</Link>
      </Button>
    </div>
  );
}
