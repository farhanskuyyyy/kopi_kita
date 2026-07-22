import { Link } from "react-router-dom";
import type { UseQueryResult } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { useCategoryCount, useOpenOrderCount, useProductCount } from "../hooks/useAdminDashboard";
import { useStaffSessionStore } from "@/features/auth/store/staffSessionStore";

function CountTile({ label, query, to }: { label: string; query: UseQueryResult<number>; to: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-9 w-16" />
        ) : query.isError ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">—</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Retry" onClick={() => query.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link to={to} className="text-3xl font-bold hover:underline">
            {query.data}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

/** Screen 18 — Admin Dashboard (F-030). A count of 0 is valid, never treated as "empty". */
export function AdminDashboardPage() {
  const staffUser = useStaffSessionStore((s) => s.staffUser);
  const productCount = useProductCount();
  const categoryCount = useCategoryCount();
  const orderCount = useOpenOrderCount();

  const isCatalogAdmin = staffUser?.role === "catalog-admin";
  const isFulfillment = staffUser?.role === "fulfillment-staff";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {isCatalogAdmin && <CountTile label="Products" query={productCount} to="/admin/products" />}
        {isCatalogAdmin && <CountTile label="Categories" query={categoryCount} to="/admin/categories" />}
        {isFulfillment && <CountTile label="Open Orders" query={orderCount} to="/admin/orders" />}
      </div>

      <div className="flex flex-wrap gap-3">
        {isCatalogAdmin && (
          <>
            <Button asChild variant="outline">
              <Link to="/admin/products">Manage Products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/categories">Manage Categories</Link>
            </Button>
          </>
        )}
        {isFulfillment && (
          <Button asChild variant="outline">
            <Link to="/admin/orders">View Orders</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
