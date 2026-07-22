import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFieldSkeleton } from "@/components/feedback/Skeletons";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ProductForm } from "../components/ProductForm";
import { useAdminProduct, useDeleteProduct, useRestoreProduct, useUpdateProduct } from "../hooks/useAdminProducts";
import { NotFoundError, ApiError } from "@/lib/api/ApiError";
import { formatDateTime } from "@/lib/format/date";
import { toast } from "@/lib/toast";

/** Screen 21 — Admin Product Edit (F-033, F-034, A12). */
export function AdminProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const productQuery = useAdminProduct(productId);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const restoreProduct = useRestoreProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [conflict, setConflict] = useState(false);

  if (productQuery.isError && productQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  if (productQuery.isLoading) {
    return (
      <div className="max-w-2xl space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <FormFieldSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return <ErrorBanner message="Couldn't load this product." onRetry={() => productQuery.refetch()} />;
  }

  const product = productQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Product</h1>
          {product.lastUpdatedAt && (
            <p className="text-xs text-muted-foreground">Last updated: {formatDateTime(product.lastUpdatedAt)}</p>
          )}
        </div>
        {product.isDeleted ? (
          <Button
            variant="outline"
            isLoading={restoreProduct.isPending}
            onClick={() =>
              restoreProduct.mutate(product.id, {
                onSuccess: () => toast.success("Product restored"),
                onError: () => toast.error("Couldn't restore product."),
              })
            }
          >
            Restore
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      {conflict && (
        <ErrorBanner message="This product was deleted by another session." />
      )}

      <ProductForm
        defaultValues={{
          name: product.name,
          categoryId: product.categoryId,
          price: product.basePrice,
          description: product.description,
          image: product.image,
          available: product.available,
          customizationGroups: product.customizationGroups,
        }}
        submitLabel="Save Changes"
        isSubmitting={updateProduct.isPending}
        onSubmit={(values) => {
          updateProduct.mutate(
            {
              productId: product.id,
              payload: {
                name: values.name,
                categoryId: values.categoryId,
                price: values.price,
                description: values.description,
                image: values.image,
                available: values.available,
                customizationGroups: values.customizationGroups,
              },
            },
            {
              onSuccess: () => {
                toast.success("Product updated");
                navigate("/admin/products");
              },
              onError: (err) => {
                if (err instanceof ApiError && err.code === "PRODUCT_DELETED") {
                  setConflict(true);
                  return;
                }
                toast.error(err instanceof ApiError ? err.message : "Couldn't update product.");
              },
            },
          );
        }}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>{product.name} remains referenced in past orders.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteProduct.isPending}
              onClick={() =>
                deleteProduct.mutate(product.id, {
                  onSuccess: () => {
                    toast.success("Product deleted");
                    navigate("/admin/products");
                  },
                  onError: () => toast.error("Couldn't delete product."),
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
