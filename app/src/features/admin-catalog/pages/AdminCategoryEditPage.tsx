import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/FormField";
import { FormFieldSkeleton } from "@/components/feedback/Skeletons";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryFormSchema, type CategoryFormValues } from "../schemas/categorySchema";
import { useAdminCategory, useDeleteCategory, useUpdateCategory } from "../hooks/useAdminCategories";
import { ApiError, NotFoundError } from "@/lib/api/ApiError";
import { toast } from "@/lib/toast";
import { Link } from "react-router-dom";

/** Screen 24 — Admin Category Edit (F-038, F-039). */
export function AdminCategoryEditPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const categoryQuery = useAdminCategory(categoryId);
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema) });

  useEffect(() => {
    if (categoryQuery.data) setValue("name", categoryQuery.data.name);
  }, [categoryQuery.data, setValue]);

  if (categoryQuery.isError && categoryQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  if (categoryQuery.isLoading) {
    return (
      <div className="max-w-md space-y-4">
        <FormFieldSkeleton />
      </div>
    );
  }

  if (categoryQuery.isError || !categoryQuery.data) {
    return <ErrorBanner message="Couldn't load this category." onRetry={() => categoryQuery.refetch()} />;
  }

  const category = categoryQuery.data;

  function onSubmit(values: CategoryFormValues) {
    updateCategory.mutate(
      { categoryId: category.id, name: values.name },
      {
        onSuccess: () => {
          toast.success("Category updated");
          navigate("/admin/categories");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "CATEGORY_NAME_EXISTS") {
            setError("name", { message: err.message });
            return;
          }
          toast.error("Couldn't update category.");
        },
      },
    );
  }

  function handleDelete() {
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success("Category deleted");
        navigate("/admin/categories");
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
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Category</h1>
        <span className="text-sm text-muted-foreground">{category.productCount} products</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="name" label="Name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <div className="flex gap-2">
          <Button type="submit" isLoading={updateCategory.isPending}>
            Save
          </Button>
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </form>

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          setConfirmDelete(open);
          if (!open) setGuardMessage(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          {guardMessage && (
            <div className="space-y-2 text-sm">
              <p className="text-destructive">{guardMessage}</p>
              <Link
                to={`/admin/products?category=${category.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                View assigned products to reassign them
              </Link>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            {!guardMessage && (
              <Button variant="destructive" isLoading={deleteCategory.isPending} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
