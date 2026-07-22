import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { TableRowsSkeleton } from "@/components/feedback/Skeletons";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { useAdminProducts, useDeleteProduct, useToggleAvailability } from "../hooks/useAdminProducts";
import { formatIDR } from "@/lib/format/currency";
import { toast } from "@/lib/toast";

/** Screen 19 — Admin Product List (F-031, F-035). */
export function AdminProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category") ?? undefined;
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [availability, setAvailability] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const productsQuery = useAdminProducts({
    search: search || undefined,
    category: categoryFilter,
    availability,
    includeDeleted,
    limit: 50,
  });
  const deleteProduct = useDeleteProduct();
  const toggleAvailability = useToggleAvailability();

  const items = productsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link to="/admin/products/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Product
          </Link>
        </Button>
      </div>

      {categoryFilter && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">Filtered by category</Badge>
          <button
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete("category"); return next; })}
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={availability} onValueChange={(v) => setAvailability(v as typeof availability)}>
          <SelectTrigger className="w-40" aria-label="Filter by availability">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All availability</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="show-deleted" checked={includeDeleted} onCheckedChange={setIncludeDeleted} />
          <Label htmlFor="show-deleted" className="text-sm font-normal">
            Show deleted
          </Label>
        </div>
      </div>

      {productsQuery.isError && <ErrorBanner message="Couldn't load products." onRetry={() => productsQuery.refetch()} />}

      {productsQuery.isSuccess && items.length === 0 && (
        <EmptyState
          title={search || availability !== "all" ? "No products found" : "Create your first product"}
          ctaLabel={search || availability !== "all" ? "Clear filters" : "New Product"}
          onCta={search || availability !== "all" ? () => { setSearch(""); setAvailability("all"); } : undefined}
          ctaHref={!search && availability === "all" ? "/admin/products/new" : undefined}
        />
      )}

      {(productsQuery.isLoading || items.length > 0) && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsQuery.isLoading && <TableRowsSkeleton rows={5} columns={5} />}
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                      {product.isDeleted && (
                        <Badge variant="secondary" className="ml-2">
                          Deleted
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{product.categoryName}</TableCell>
                    <TableCell>{formatIDR(product.basePrice)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          aria-label={`Toggle availability for ${product.name}`}
                          checked={product.available}
                          disabled={product.isDeleted}
                          onCheckedChange={(checked) =>
                            toggleAvailability.mutate(
                              { productId: product.id, available: checked },
                              {
                                onSuccess: () => toast.success("Availability updated"),
                                onError: () => toast.error("Couldn't update availability."),
                              },
                            )
                          }
                        />
                        <span className="text-sm text-muted-foreground">{product.available ? "In stock" : "Out of stock"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/products/${product.id}/edit`}>Edit</Link>
                      </Button>
                      {!product.isDeleted && (
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget({ id: product.id, name: product.name })}>
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete product?"
        isLoading={deleteProduct.isPending}
        onConfirm={() =>
          deleteTarget &&
          deleteProduct.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Product deleted");
              setDeleteTarget(null);
            },
            onError: () => toast.error("Couldn't delete product."),
          })
        }
      >
        <p>{deleteTarget?.name} will be hidden from the customer catalog but remains referenced in past orders.</p>
      </ConfirmDeleteDialog>
    </div>
  );
}
