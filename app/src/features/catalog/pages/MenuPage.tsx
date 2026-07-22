import { useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ProductGrid } from "../components/ProductGrid";
import { ProductGridSkeleton } from "@/components/feedback/Skeletons";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCategoryBySlug, useProducts } from "../hooks/useCatalog";
import { NotFoundError } from "@/lib/api/ApiError";
import type { ListProductsParams } from "../api/catalogApi";

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
] as const;

/** Screen 2 — Catalog / Menu (F-001, F-004, F-005). */
export function MenuPage() {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryQuery = useCategoryBySlug(categorySlug);

  const sortParam = searchParams.get("sort");
  const VALID_SORTS = ["price_asc", "price_desc", "popularity"] as const;
  const sort: ListProductsParams["sort"] = (VALID_SORTS as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as ListProductsParams["sort"])
    : "popularity";
  const availability = searchParams.get("availability") === "in_stock_only" ? "in_stock_only" : "all";

  const filters: ListProductsParams = useMemo(
    () => ({ category: categorySlug, sort, availability, limit: 24 }),
    [categorySlug, sort, availability],
  );

  const productsQuery = useProducts(filters);

  if (categorySlug && categoryQuery.isError && categoryQuery.error instanceof NotFoundError) {
    return <Navigate to="/404" replace />;
  }

  const categoryLabel = categorySlug ? categoryQuery.data?.name ?? "…" : "All Products";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Menu", to: "/menu" }, ...(categorySlug ? [{ label: categoryLabel }] : [])]} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{categoryLabel}</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="in-stock-only"
              checked={availability === "in_stock_only"}
              onCheckedChange={(checked) => {
                const next = new URLSearchParams(searchParams);
                if (checked) next.set("availability", "in_stock_only");
                else next.delete("availability");
                setSearchParams(next);
              }}
            />
            <Label htmlFor="in-stock-only" className="text-sm font-normal">
              In stock only
            </Label>
          </div>
          <Select
            value={sort}
            onValueChange={(value) => {
              const next = new URLSearchParams(searchParams);
              next.set("sort", value);
              setSearchParams(next);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Sort products">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {productsQuery.isLoading && <ProductGridSkeleton />}

      {productsQuery.isError && <ErrorBanner message="Couldn't load products." onRetry={() => productsQuery.refetch()} />}

      {productsQuery.isSuccess && productsQuery.data.items.length === 0 && (
        <EmptyState
          title={availability === "in_stock_only" ? "No matches for current filters" : "No products in this category"}
          description="Try adjusting or clearing your filters."
          ctaLabel="Clear filters"
          onCta={() => setSearchParams({})}
        />
      )}

      {productsQuery.isSuccess && productsQuery.data.items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{productsQuery.data.items.length} products</p>
          <ProductGrid products={productsQuery.data.items} />
        </>
      )}
    </div>
  );
}
