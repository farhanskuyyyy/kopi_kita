import { useQuery } from "@tanstack/react-query";
import { getCategoryBySlug, getProduct, listCategories, listProducts, type ListProductsParams } from "../api/catalogApi";
import { NotFoundError } from "@/lib/api/ApiError";

/** Frontend-Architecture §2.1 — typed query-key factories, never hand-stringified. */
export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
  bySlug: (slug: string) => [...categoryKeys.all, "slug", slug] as const,
};

export const productKeys = {
  all: ["products"] as const,
  list: (filters: ListProductsParams) => [...productKeys.all, "list", filters] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
};

export function useCategories() {
  return useQuery({ queryKey: categoryKeys.list(), queryFn: listCategories });
}

export function useCategoryBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: categoryKeys.bySlug(slug ?? ""),
    queryFn: () => getCategoryBySlug(slug as string),
    enabled: !!slug,
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
  });
}

export function useProducts(params: ListProductsParams) {
  return useQuery({ queryKey: productKeys.list(params), queryFn: () => listProducts(params) });
}

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(productId ?? ""),
    queryFn: () => getProduct(productId as string),
    enabled: !!productId,
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < 1,
  });
}
