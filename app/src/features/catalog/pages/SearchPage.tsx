import { useSearchParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductGrid";
import { ProductGridSkeleton } from "@/components/feedback/Skeletons";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { useProducts } from "../hooks/useCatalog";
import { Search } from "lucide-react";

/** Screen 3 — Search Results (F-003). */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const productsQuery = useProducts({ q, limit: 24 });

  if (!q) {
    return (
      <EmptyState
        icon={Search}
        title="Search the menu"
        description="Type in the search box above to find drinks, food, and more."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search results for &ldquo;{q}&rdquo;</h1>

      {productsQuery.isLoading && <ProductGridSkeleton />}

      {productsQuery.isError && <ErrorBanner message="Couldn't load search results." onRetry={() => productsQuery.refetch()} />}

      {productsQuery.isSuccess && productsQuery.data.items.length === 0 && (
        <EmptyState
          icon={Search}
          title={`No results for "${q}"`}
          description="Try a different keyword, or browse our categories instead."
          ctaLabel="Browse Menu"
          ctaHref="/menu"
        />
      )}

      {productsQuery.isSuccess && productsQuery.data.items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{productsQuery.data.items.length} results</p>
          <ProductGrid products={productsQuery.data.items} />
        </>
      )}
    </div>
  );
}
