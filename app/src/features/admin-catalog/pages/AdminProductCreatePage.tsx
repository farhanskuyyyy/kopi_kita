import { useNavigate } from "react-router-dom";
import { ProductForm } from "../components/ProductForm";
import { useCreateProduct } from "../hooks/useAdminProducts";
import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/api/ApiError";

/** Screen 20 — Admin Product Create (F-032). */
export function AdminProductCreatePage() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Product</h1>
      <ProductForm
        submitLabel="Save"
        isSubmitting={createProduct.isPending}
        onSubmit={(values) => {
          createProduct.mutate(
            {
              name: values.name,
              categoryId: values.categoryId,
              price: values.price,
              description: values.description,
              image: values.image,
              available: values.available,
              customizationGroups: values.customizationGroups,
            },
            {
              onSuccess: () => {
                toast.success("Product created");
                navigate("/admin/products");
              },
              onError: (err) => {
                toast.error(err instanceof ApiError ? err.message : "Couldn't create product.");
              },
            },
          );
        }}
      />
    </div>
  );
}
