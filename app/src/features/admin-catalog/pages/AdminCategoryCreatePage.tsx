import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/FormField";
import { categoryFormSchema, type CategoryFormValues } from "../schemas/categorySchema";
import { useCreateCategory } from "../hooks/useAdminCategories";
import { ApiError } from "@/lib/api/ApiError";
import { toast } from "@/lib/toast";

/** Screen 23 — Admin Category Create (F-037). */
export function AdminCategoryCreatePage() {
  const navigate = useNavigate();
  const createCategory = useCreateCategory();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categoryFormSchema) });

  function onSubmit(values: CategoryFormValues) {
    createCategory.mutate(values.name, {
      onSuccess: () => {
        toast.success("Category created");
        navigate("/admin/categories");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === "CATEGORY_NAME_EXISTS") {
          setError("name", { message: err.message });
          return;
        }
        toast.error("Couldn't create category.");
      },
    });
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">New Category</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="name" label="Name" required error={errors.name?.message}>
          <Input {...register("name")} />
        </FormField>
        <div className="flex gap-2">
          <Button type="submit" isLoading={createCategory.isPending}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/categories")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
