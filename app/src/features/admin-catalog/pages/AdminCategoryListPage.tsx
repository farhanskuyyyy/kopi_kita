import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { TableRowsSkeleton } from "@/components/feedback/Skeletons";
import { ConfirmDeleteDialog } from "@/components/feedback/ConfirmDeleteDialog";
import { useAdminCategories, useDeleteCategory } from "../hooks/useAdminCategories";
import { ApiError } from "@/lib/api/ApiError";
import { toast } from "@/lib/toast";

/** Screen 22 — Admin Category List (F-036). Delete guard per D1/A1/F-039. */
export function AdminCategoryListPage() {
  const [search, setSearch] = useState("");
  const categoriesQuery = useAdminCategories(search || undefined);
  const deleteCategory = useDeleteCategory();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);

  const items = categoriesQuery.data ?? [];

  function handleDelete(id: string) {
    deleteCategory.mutate(id, {
      onSuccess: () => {
        toast.success("Category deleted");
        setDeleteTarget(null);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === "CATEGORY_HAS_PRODUCTS") {
          setGuardMessage(err.message);
          return;
        }
        toast.error("Couldn't delete category.");
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button asChild>
          <Link to="/admin/categories/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Category
          </Link>
        </Button>
      </div>

      <Input placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

      {categoriesQuery.isError && <ErrorBanner message="Couldn't load categories." onRetry={() => categoriesQuery.refetch()} />}

      {categoriesQuery.isSuccess && items.length === 0 && (
        <EmptyState title="Create your first category" ctaLabel="New Category" ctaHref="/admin/categories/new" />
      )}

      {(categoriesQuery.isLoading || items.length > 0) && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesQuery.isLoading && <TableRowsSkeleton rows={4} columns={3} />}
                {items.map((category) => {
                  const hasProducts = category.productCount > 0;
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.productCount}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/categories/${category.id}/edit`}>Edit</Link>
                        </Button>
                        <span
                          title={
                            hasProducts
                              ? `Can't delete: ${category.productCount} product${category.productCount === 1 ? "" : "s"} assigned to this category.`
                              : undefined
                          }
                        >
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={hasProducts}
                            onClick={() => setDeleteTarget(category)}
                          >
                            Delete
                          </Button>
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setGuardMessage(null);
          }
        }}
        title="Delete category?"
        isLoading={deleteCategory.isPending}
        hideConfirm={!!guardMessage}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      >
        {guardMessage ? (
          <>
            <p className="text-destructive">{guardMessage}</p>
            <Link
              to={`/admin/products?category=${deleteTarget?.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              View assigned products to reassign them
            </Link>
          </>
        ) : (
          <p>This cannot be undone. Delete {deleteTarget?.name}?</p>
        )}
      </ConfirmDeleteDialog>
    </div>
  );
}
