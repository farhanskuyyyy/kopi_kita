import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminGetCategory,
  adminListCategories,
  adminUpdateCategory,
} from "../api/adminCategoriesApi";
import { categoryKeys } from "@/features/catalog/hooks/useCatalog";
import { NotFoundError } from "@/lib/api/ApiError";

export const adminCategoryKeys = {
  all: ["admin", "categories"] as const,
  list: (search?: string) => [...adminCategoryKeys.all, "list", search ?? ""] as const,
  detail: (id: string) => [...adminCategoryKeys.all, "detail", id] as const,
};

export function useAdminCategories(search?: string) {
  return useQuery({
    queryKey: adminCategoryKeys.list(search),
    queryFn: () => adminListCategories({ search }),
    meta: { authDomain: "staff" },
  });
}

export function useAdminCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: adminCategoryKeys.detail(categoryId ?? ""),
    queryFn: () => adminGetCategory(categoryId as string),
    enabled: !!categoryId,
    meta: { authDomain: "staff" },
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
  });
}

function invalidateCategoryCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
  queryClient.invalidateQueries({ queryKey: categoryKeys.all });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => adminCreateCategory(name),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateCategoryCaches(queryClient),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) => adminUpdateCategory(categoryId, name),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateCategoryCaches(queryClient),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => adminDeleteCategory(categoryId),
    meta: { authDomain: "staff" },
    onSuccess: () => invalidateCategoryCaches(queryClient),
  });
}
