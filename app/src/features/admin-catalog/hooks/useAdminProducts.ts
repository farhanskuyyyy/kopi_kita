import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetProduct,
  adminListProducts,
  adminRestoreProduct,
  adminToggleAvailability,
  adminUpdateProduct,
  type AdminListProductsParams,
  type ProductFormPayload,
} from "../api/adminProductsApi";
import { productKeys } from "@/features/catalog/hooks/useCatalog";
import { NotFoundError } from "@/lib/api/ApiError";

export const adminProductKeys = {
  all: ["admin", "products"] as const,
  list: (filters: AdminListProductsParams) => [...adminProductKeys.all, "list", filters] as const,
  detail: (id: string) => [...adminProductKeys.all, "detail", id] as const,
};

export function useAdminProducts(params: AdminListProductsParams) {
  return useQuery({
    queryKey: adminProductKeys.list(params),
    queryFn: () => adminListProducts(params),
    meta: { authDomain: "staff" },
  });
}

export function useAdminProduct(productId: string | undefined) {
  return useQuery({
    queryKey: adminProductKeys.detail(productId ?? ""),
    queryFn: () => adminGetProduct(productId as string),
    enabled: !!productId,
    meta: { authDomain: "staff" },
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
  });
}

function invalidateProductCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
  queryClient.invalidateQueries({ queryKey: productKeys.all });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductFormPayload) => adminCreateProduct(payload),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateProductCaches(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: ProductFormPayload }) => adminUpdateProduct(productId, payload),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateProductCaches(queryClient),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => adminDeleteProduct(productId),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateProductCaches(queryClient),
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => adminRestoreProduct(productId),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateProductCaches(queryClient),
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, available }: { productId: string; available: boolean }) => adminToggleAvailability(productId, available),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateProductCaches(queryClient),
  });
}
